================================
Acorn VM Cluster Initialization
================================

This details the process we went through the to initialize all cluster
components for the first time. This requires some additional steps compared to
starting an initialized cluster, or adding nodes to an existing cluster(see
``maintenance.rst`` for those topics).


Initial Cluster Setup
======================

Start up all of your Controller, Compute, & Storage Nodes and use the preseed
file to install Ubuntu on them. Once the basic OS is installed, follow the Sudo
& Network setup instructions in the README..

Write down which interface connects to which network on each node(or have
``hardware.rst`` open for reference), this will be useful as you won't have to
keep checking the config file. Add any extra files to the ``host_vars``
directory - look at similar hosts to see what variables need to be defined.

Next run the ansible playbook with the ``initial`` tag::

    ansible-playbook acorn.yml -t initial

This will fail when mysql is restarted because there is no running cluster for
the nodes to join. On your first controller, run ``sudo galera_new_cluster`` to
start a one-node cluster, then run ``sudo systemctl start mysql`` on the other
controllers to have them join that cluster.

Now run the playbook with the ``ha`` tag to install the High Availability
dependencies::

    ansible-playbook acorn.yml -t ha

Follow the instructions in the ``High Availability Initialization`` section to
setup the Master Controller Virtual IP Address & HAProxy.

On your controllers, add the Open vSwitch Bridge::

    sudo ovs-vsctl add-br br-provider

On your compute nodes, add the Open vSwitch Bridge & attach the provider
interface::

    sudo ovs-vsctl add-br br-provider
    sudo ovs-vsctl add-port br-provider THE_NODES_PROVIDER_INTERFACE

Now run the entire playbook::

    ansible-playbook acorn.yml

Once that's finished, follow the instructions in the ``Ceph Initialization``
section.

You should be set now, you can verify by running the following commands on the
first controller node::

    cd ~
    . admin-openrc.sh

    # Image Service
    sudo apt-get install -y qemu-utils
    wget http://download.cirros-cloud.net/0.3.5/cirros-0.3.5-x86_64-disk.img
    qemu-img convert -f qcow2 -O raw cirros-0.3.5-x86_64-disk.img cirros.raw
    openstack image create "cirros" --file cirros.raw --disk-format raw \
        --container-format bare --public
    openstack image list

    # Compute Service
    openstack compute service list

    # Networking Service
    neutron ext-list
    openstack network agent list

    # Block Storage Service
    openstack volume service list

    # Launch a VM
    openstack flavor create --id 0 --vcpus 1 --ram 64 --disk 1 nano
    . acorn-openrc.sh
    openstack security group rule create --proto icmp default
    openstack security group rule create --proto tcp --dst-port 22 default
    openstack network list
    PRIVATE_NETWORK_ID="$(openstack network list -f value -c ID -c Name | grep private | cut -f1 -d' ')"
    openstack server create --flavor nano --image cirros \
        --nic net-id=$PRIVATE_NETWORK_ID --security-group default test-instance
    openstack server list
    openstack floating ip create provider   # Check the created IP
    FLOATING_IP="$(openstack floating ip list -c 'Floating IP Address' -f value)"
    openstack server add floating ip test-instance $FLOATING_IP
    echo $FLOATING_IP
    # Should be able to ssh in as `cirros` w/ password `cubswin:)`



High Availability Initialization
=================================

Some manual setup is required for highly available controller nodes.  You
should have only one controller node for this initial setup. Add additional
controller nodes after setting up the OpenStack cluster for the first time.

MySQL
------

Stop the mysql server on the controller node & start it as a cluster::

    sudo systemctl stop mysql
    sudo galera_new_cluster

RabbitMQ
---------

Join the backup controllers to the master controller::

    # On stack-controller-2, stack-controller-3
    sudo rabbitmqctl stop_app
    sudo rabbitmqctl join_cluster rabbit@stack-controller-1
    sudo rabbitmqctl start_app

Then, on any controller node, enable mirroring of all queues::

    sudo rabbitmqctl cluster_status
    sudo rabbitmqctl set_policy ha-all '^(?!amq\.).*' '{"ha-mode": "all"}'

Pacemaker
----------

Ansible only installs the Pacemaker & HAProxy packages. You will need to create
the cluster & Virtual IP address when first creating the OpenStack cluster.

Start by removing the initial config file & authenticating the controller
node::

    sudo pcs cluster destroy
    sudo pcs cluster auth stack-controller-1 stack-controller-2 \
        -u hacluster -p PASSWORD

Create, start, & enable the cluster::

    sudo pcs cluster setup --start --enable --name acorn-controller-cluster \
        --force stack-controller-1 stack-controller-2

Set some basic properties::

    sudo pcs property set pe-warn-series-max=1000 \
        pe-input-series-max=1000 \
        pe-error-series-max=1000 \
        cluster-recheck-interval=3min

Disable STONITH for now::

    sudo pcs property set stonith-enabled=false

TODO: Instructions for re-enabling STONITH

Create the Virtual IP Address::

    sudo pcs resource create management-vip ocf:heartbeat:IPaddr2 \
        params ip="10.2.1.10" cidr_netmask="24" op monitor interval="30s"

Add HAProxy to the cluster & only serve the VIP when HAProxy is running::

    sudo pcs resource create lb-haproxy lsb:haproxy --clone
    sudo pcs constraint order start management-vip then lb-haproxy-clone kind=Optional
    sudo pcs constraint colocation add lb-haproxy-clone with management-vip

TODO: Add following after openstack setup, so force not needed?

Add the Glance service to Pacemaker::

    sudo pcs resource create glance-api lsb:glance-api --clone --force

Add the Cinder service to Pacemaker::

    sudo pcs resource create cinder-api lsb:cinder-api --clone interleave=true --force
    sudo pcs resource create cinder-scheduler lsb:cinder-scheduler --clone interleave=true --force




Ceph Initialization
====================

Ansible only installs the ``ceph-deploy`` tool on controller nodes, Ceph
cluster initialization must be done manually, but only on creation of the
OpenStack cluster. If you are simply adding additional nodes to an existing
cluster, you can skip this section.

Ceph Setup
-----------

Start by SSHing into the master controller, we'll make running repeated
commands easier by setting some array variables::

    # On stack-controller-1
    CONTROLLERS=('stack-controller-1' 'stack-controller-2')
    COMPUTE=('stack-compute-1')
    STORAGE=('stack-storage-1' 'stack-storage-2' 'stack-storage-3')

Then generate an SSH key & copy it to the Controller & Storage nodes::

    ssh-keygen -t ecdsa -b 521
    for SRV in "${CONTROLLERS[@]}" "${COMPUTE[@]}" "${STORAGE[@]}"; do ssh-copy-id $SRV; done

Now create a directory for the cluster configuration::

    mkdir ~/ceph-cluster
    cd ~/ceph-cluster

Deploy the initial cluster with the Controller nodes as monitors::

    ceph-deploy new --public-network 10.4.1.0/24 ${CONTROLLERS[@]}

Open up the ``ceph.conf`` in ``~/ceph-cluster/`` and add the cluster network
setting::

    cluster network = 10.5.1.0/24

Install Ceph on the nodes(we specify the full repo URL instead of just using
``--release kraken`` to avoid HTTPS, allowing packages to be cached by our web
proxy)::

    ceph-deploy install --repo-url http://download.ceph.com/debian-kraken ${CONTROLLERS[@]} ${STORAGE[@]}

Then create the initial monitors & start them on boot::

    ceph-deploy mon create-initial
    for SRV in "${CONTROLLERS[@]}"; do
        ssh $SRV sudo systemctl enable ceph-mon.target
    done

Next, add the OSDs. You'll want an SSD with a journal partition for each
OSD(``/dev/sdb#``), and an HDD for each OSD::

    ceph-deploy osd create stack-storage-1:/dev/sdc:/dev/sdb1 stack-storage-1:/dev/sdd:/dev/sdb2 \
        stack-storage-2:/dev/sdc:/dev/sdb1 stack-storage-2:/dev/sdd:/dev/sdb2 \
        stack-storage-3:/dev/sdc:/dev/sdb1 stack-storage-3:/dev/sdd:/dev/sdb2

    # If your drive layout is identical on every storage server:
    for SRV in "${STORAGE[@]}"; do
        ceph-deploy osd create $SRV:/dev/sdc:/dev/sdb1 $SRV:/dev/sdd:/dev/sdb2
    done

Now copy the configuraton file & admin key to the controller nodes::

    ceph-deploy admin ${CONTROLLERS[@]}

And set the correct permissions on the admin key::

    for SRV in "${CONTROLLERS[@]}" "${STORAGE[@]}"; do
        ssh $SRV sudo chmod +r /etc/ceph/ceph.client.admin.keyring
    done

Check the health of the storage cluster with ``ceph health`` & watch syncing
progress with ``ceph -w``.


OpenStack Integration
----------------------

Now we'll make OpenStack use the Ceph cluster for Image & Block storage. Start
by creating some pools to use::

    ceph osd pool create volumes 512
    ceph osd pool create vms 128
    ceph osd pool create images 64

Create Ceph Users for the various OpenStack Services, and assign them the
appropriate pool permissions::

    ceph auth get-or-create client.glance mon 'allow r' osd 'allow class-read object_prefix rbd_children, allow rwx pool=images'
    ceph auth get-or-create client.cinder mon 'allow r' osd 'allow class-read object_prefix rbd_children, allow rwx pool=volumes, allow rwx pool=vms, allow rwx pool=images'

Then copy them to your nodes::

    # Copy glance key to controllers
    for SRV in ${CONTROLLERS[@]}; do
        ceph auth get-or-create client.glance | ssh $SRV sudo tee /etc/ceph/ceph.client.glance.keyring
        ssh $SRV sudo chown glance:glance /etc/ceph/ceph.client.glance.keyring
    done

    # Copy cinder key to controller & compute nodes
    for SRV in "${CONTROLLERS[@]}" "${COMPUTE[@]}"; do
        ceph auth get-or-create client.cinder | ssh $SRV sudo tee /etc/ceph/ceph.client.cinder.keyring
    done

    # Set the correct permissions on controller nodes
    for SRV in "${CONTROLLERS[@]}"; do
        ssh $SRV sudo chown cinder:cinder /etc/ceph/ceph.client.cinder.keyring
    done

Copy the ``ceph.conf`` to the Compute nodes(it should already be present on the
other nodes)::

    for SRV in "${COMPUTE[@]}"; do
        ssh $SRV sudo tee /etc/ceph/ceph.conf < /etc/ceph/ceph.conf
    done

Display the secret key for the ``client.cinder`` ceph user and add it to the
ansible password vault as ``vaulted_rbd_cinder_key``::

    ceph auth get-key client.cinder

Generate a UUID to use for the ``libvirt`` secret using ``uuidgen``. Add the
UUID to the ansible password vault as ``vaulted_rbd_cinder_uuid``. Make sure to
re-run the ansible playbook for the compute nodes so the libvirt secret is
added(``ansible-playbook acorn.yml -t compute``).

Finally, restart the OpenStack services::

    # On Controller
    for SRV in "${CONTROLLERS[@]}"; do
        ssh $SRV sudo systemctl restart glance-api
        ssh $SRV sudo systemctl restart cinder-volume
    done

    # On Compute
    for SRV in "${COMPUTE[@]}"; do
        ssh $SRV sudo systemctl restart nova-compute
    done

Test the setup::

    # On Controller
    source acorn-openrc.sh

    # Add an Image
    openstack image create cirros --file cirros.raw --disk-format raw --container-format bare --public
    rbd -p images ls

    # Create a Volume
    openstack volume create --size 10 test-vol
    rbd -p volumes ls
