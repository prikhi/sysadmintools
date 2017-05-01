=================
Acorn VM Cluster
=================

The ``vm_cluster`` folder contains files relevant to administration of Acorn's
VM cluster, which runs on `OpenStack Newton`_ with Ubuntu nodes.


Automated Installs
===================

The initial OS install is automated using a `Ubuntu pre-seed file`_. This will
install a basic Ubuntu SSH server. Then some manual setup is required. The rest
of the configuration is automated using an `Ansible`_ playbook.

Ubuntu Pre-Seed File
---------------------

The ``devstack-preseed.cfg`` file is a pre-seed file for the `Ubuntu Automated
Installer`_. It sets up an ssh server, a ``stack`` user, and installs
``python``, ``git`` & ``vim``.

Start by booting up a `Ubuntu Mini Image`_, when the menu appears, press
``<TAB>`` and add the following: ``auto=true priority=critical
interface=<desired_interface> hostname=<desired_hostname> url=<preseed_url>``.
The ``interface=`` is only required if you have multiple network interfaces.
If you don't know which interface it is, leave it out to enable the selection
menu, then press ``<CTRL>-<ALT>-<F2>`` to get a shell and investigate which is
plugged in, or just plug every network port in and specify ``interface=auto``.
For example::

    auto=true priority=critical interface=ens4p0f0 hostname=openstack-aio.acorn url=http://lucy.acorn/devstack-preseed.cfg

You will face issues if the installation media is on a USB stick and the
installer sees it as ``/dev/sda``. Grub will try to install to the MBR of
``/dev/sda`` and fail. To fix this, open a shell and run ``grub-installer
/target``, then choose to install grub to the proper drive(probably
``/dev/sdb``).

Sudo Setup
-----------

The nodes should be setup to use ``sudo`` without a password::

    visudo
    # Add the following line:
    # %sudo ALL=(ALL) NOPASSWD: ALL

Network Setup
--------------

The management network and provider network must be setup by manually editing
``/etc/network/interfaces``::

    # The primary public interface - for access nodes only
    auto enp0s3
    iface enp0s3 inet dhcp

    # The Management Network Interface
    auto enp0s8
    iface enp0s8 inet static
        address 10.5.1.11
        netmask 255.255.255.0

On controller nodes, add the Provider Network Interface::

    # The Provider Network Interface
    auto enp0s9
    iface enp0s9 inet manual
    up ip link set $IFACE up
    down ip link set $IFACE down

On storage nodes, add the Storage Network Interface as well::

    auto enp0s10
    iface enp0s10 inet static
        address 10.5.2.10
        netmask 255.255.255.0

Then restart the networking service::

    sudo systemctl restart networking


Ansible Playbook
-----------------

The Ansible playbook is a series of tasks(grouped into roles) that ensure
OpenStack is installed & properly configured. The playbook currently has roles
for ``controller``, ``compute``, and ``storage`` nodes.

The ``cluster-servers`` file specifies the address, name and node type of each
of our OpenStack servers. Currently there is only a single controller, two
compute nodes, & three storage nodes.

You can run the playbook by installing ansible with pip and using the
``ansible-playbook`` command inside the ``playbook`` directory::

    sudo pip install ansible
    cd playbook
    ansible-playbook acorn.yml


Initial Cluster Setup
======================

TODO: Write initial cluster setup guide after getting everything working.


3/9/17 Test
------------

This was done when setting up controller High Availability.

**Started w/ just 1 controller node, no compute, no storage.**

First playbook run failed at starting mysql, had to start new cluster::

    sudo galera_new_cluster

Re-run, broke at rabbitmq user, fixed by re-ordering tasks & restarting
rabbitmq before adding.

Re-run broke a bootstrapping identity service, needed to remove config options,
fix name of config file.

Re-run broke at setting up projects. Need to do initial pacemaker config. Had
to change ``hacluster`` user password manually.

Re-run finished all updated tasks(after Glance setup). Image service verified
by image listing. Image creation does not work due to ceph not being setup.

Updated nova's tasks & config for controller HA.

Failed at nova re-run due to existing service but wrong endpoints.

TODO: Fix service/endpoint tasks to decouple service & endpoint creation.

Failed at nova addresses already bound. Fixed by setting
``osapi_compute_listen``, ``novncproxy_host``, & ``metadata_listen_host`` to
management IP.

TODO: PR OpenStack HA Docs to Fix Required Nova Listen Options

Re-run finished all nova tasks. Nova service verified by compute service list.

Updated neutron's tasks & config.

Failed at neutron.wsgi unable to bind address. Fixed by setting ``bind_host``
in neutron.conf

TODO: PR OpenStack HA Docs to Fix Required Neutron Listen Options

Re-run finished all neutron tasks. Verified by service list.

Updated cinder's tasks & config.

Re-run finished all cinder tasks, verify by volume service list.

Updated horizon tasks.

Re-run finished all horizon tasks, verify by visitng site.

Re-run failed at creating router, not enough l3 agents available. Fixed by
lowering min to ``1``.

Re-run completed all controller tasks.


**Add 1 Compute Node**

Did minimal setup for new node & re-ran ansible playbook.

Verified by running ``openstack compute service list``.


**Add 2 Storage Nodes**

Did minimal setup for new nodes & re-ran ansible playbook.

Followed initial ceph setup.

Verified by running ``openstack volume service list``.

Test stack by adding image, & launching server by making image into volume.


**Add Backup Controller Node**

Did minimal setup for new nodes & re-ran ansible playbook.

Failed at restarting mysql. Issue was wrong list of ips for cluster setting.
After fixing, it failed when trying to restart galera, since it brought all
cluster servers down. Fixed by staggering restarts, backup controllers first,
then the master controller.

Rerun of playbook passed. Followed instructions from "adding nodes".

Tested by shutting down controller 1 and provisioning a server. Failed at
openstack auth, needed to copy fernet keys from master controller. Fixed by
adding keys to vault.

Was then able to get token, failed at uploading image. Needed to setup ceph keys.
After fixing & documenting, was able to create image, launch server, & SSH in.
Then started master controller and shutdown backup, still able to SSH into server.


4/30/17 Test
-------------

Trial moving Ceph monitors to Controller. Started by wiping block storage
servers, & purging ceph & data from controllers.

Ran ansible playbook.

SSH into controller, push ssh keys.

Deploy new node to controllers::

    ceph-deploy new stack-controller-1 stack-controller-2

Install::

    ceph-deploy new stack-controller-1 stack-controller-2 \
        stack-storage-1 stack-storage-2 stack-storage-3

From creating initial monitors onwards works the same. Verified by uploading
image, creating volume, & launching instance.


Adding Nodes
=============

Adding additional controller, compute, or storage nodes is fairly straightforward.

Controller
-----------

New controllers require some manual configuration due to the high availability
setup. Start with the minimal setup and ansible playbook. Add any extra
controllers to the ``backup-controller`` group in the ``cluster-servers`` file.

MySQL
++++++

The new controller should automatically connect to the MySQL cluster. You can
verify this by checking the cluster size::

    echo "SHOW STATUS LIKE '%cluster_size';" | mysql -u root -p

RabbitMQ
+++++++++

The ansible playbook will have copied an erlang cookie to all the controller
hosts. Restart the new node in clustering mode::

    sudo rabbitmqctl stop_app
    sudo rabbitmqctl join_cluster rabbit@stack-controller-1
    sudo rabbitmqctl start_app

Check the status, then enable mirroring of all queues::

    sudo rabbitmqctl cluster_status
    sudo rabbitmqctl set_policy ha-all '^(?!amq\.).*' '{"ha-mode": "all"}'

Pacemaker
++++++++++

You'll need to authenticate the new node from the master controller::

    # On stack-controller-1
    sudo pcs cluster auth -u hacluster stack-controller-2

Next, remove the default cluster from the new node::

    # On stack-controller-2
    sudo pcs cluster destroy

Add the new node using the master controller and start the service on the new
node::

    # On stack-controller-1
    sudo pcs cluster node add stack-controller-2

    # On stack-controller-2
    sudo pcs cluster start
    sudo pcs cluster enable

Ceph
+++++

**Minimal**

Copy the SSH key from the master controller to the new controller::

    # On stack-controller-1
    ssh-copy-id stack-controller-3

Install & deploy Ceph on the new controller node::

    # On stack-controller-1
    cd ~/storage-cluster
    ceph-deploy install --release kraken stack-controller-3
    ceph-deploy admin stack-controller-3

Setup the new controller as a Ceph monitor::

    ceph-deploy mon add stack-controller-3


Copy the Glance Key to the new controller node::

    # On stack-controller-1
    ceph auth get-or-create client.glance | ssh stack-controller-3 sudo tee /etc/ceph/ceph.client.glance.keyring
    ssh stack-controller-3 sudo chown glance:glance /etc/ceph/ceph.client.glance.keyring

**Extra Deploy Node**

Copy the SSH key from each existing controller to the new controller::

    ssh-copy-id stack-controller-3

Then initialize a key on the new server & copy it to the existing controller
and storage nodes::

    ssh-keygen -t ecdsa -b 521
    ssh-copy-id stack-controller-1
    ssh-copy-id stack-controller-2
    ssh-copy-id stack-storage-1
    ssh-copy-id stack-storage-2
    ssh-copy-id stack-storage-3

TODO: Finish ceph-deploy node setup for extra controller

Neutron
++++++++

Add the new controller as a DHCP agent for the private network::

    cd ~
    . admin-openrc.sh
    # Run this & find the ID of the `DHCP agent` on the new controller
    openstack network agent list

    # Then add the agent as a DHCP server
    neutron dhcp-agent-network-add <dhcp-agent-id> private

TODO: Find out if needed when setting all controllers up at once & automate


Compute
--------

Simply follow the setup instructions, making sure to add the hostname to the
``compute`` group in the ``custer-servers`` hosts file. The ansible playbook
should handle the rest, and OpenStack should pickup the additional compute node
afterwards.

You can verify the setup by running ``openstack compute service list``
on a controller node. The list should include the new compute host.


Storage
--------

Follow the installation & manual setup instructions, then add the hostname to
the ``storage`` group in the ``cluster-servers`` file and run the ansible
playbook.

This will install Ceph and setup Cinder, but you'll need to manually add the
new node and any new storage drives to our Ceph cluster.

Start by pushing the SSH key from the master controller to the new node::

    # On stack-controller-1
    ssh-copy-id stack-storage-3

Then use ``ceph-deploy`` on the master controller to install Ceph on the new
node::

    cd ~/storage-cluster
    ceph-deploy install --release kraken stack-storage-3

Setup the node as a new monitor(eventually delegated to HA controllers)::

    ceph-deploy mon create stack-storage-3

Then deploy an OSD to each new storage disk. It's recommended to split the
journals out on a separate SSD with a partition for each OSD::

    ceph-deploy disk list stack-storage-3
    ceph-deploy osd create stack-storage-3:/dev/sdc:/dev/sdb1 stack-storage-3:/dev/sdd:/dev/sdb2

Copy the configuration file & admin key to the new node & set the correct
permissions::

    # On stack-controller-1
    ceph-deploy admin stack-storage-3

    # On stack-storage-3
    sudo chmod +r /etc/ceph/ceph.client.admin.keyring

Then copy the Cinder auth key to the new node::

    # On stack-controller-1
    ceph auth get-or-create client.cinder | ssh stack-storage-3 sudo tee /etc/ceph/ceph.client.cinder.keyring
    ssh stack-storage-3 sudo chown cinder:cinder /etc/ceph/ceph.client.cinder.keyring

You can monitor the rebalancing progress by running ``ceph -w`` on
stack-controller-1.

Restart the ``cinder-volume`` service so that it picks up the Ceph cluster::

    sudo systemctl restart cinder-volume

List the discovered volume services from stack-controller-1 to ensure OpenStack
sees the new node::

    . ~/admin-openrc.sh
    openstack volume service list

You should see ``cinder-volume`` up and running on your new node.


Ceph Initialization
====================

Ansible only installs the ``ceph-deploy`` tool on controller nodes, Ceph
cluster initialization must be done manually, but only on creation of the
OpenStack cluster. If you are simply adding additional nodes to an existing
cluster, you can skip this section.

Ceph Setup
-----------

TODO: Set some varibles and use loops to reduce duplicate commands

Start by SSHing into the master controller, generate an SSH key & copy it to
the Controller & Storage nodes::

    ssh-keygen -t ecdsa -b 521
    ssh-copy-id stack-controller-2
    ssh-copy-id stack-storage-1
    ssh-copy-id stack-storage-2
    ssh-copy-id stack-storage-3

Now create a directory for the cluster configuration::

    mkdir ~/acorn-cluster
    cd ~/acorn-cluster

Deploy the initial cluster with the Controller nodes as monitors::

    ceph-deploy new stack-controller-1 stack-controller-2

Open up the ``ceph.conf`` in ``~/acorn-cluster/`` and add the public & cluster
network settings::

    public network = 10.5.1.0/24
    cluster network = 10.6.1.0/24

Install Ceph on the nodes::

    ceph-deploy install --release kraken stack-controller-1 stack-controller-2 \
        stack-storage-1 stack-storage-2 stack-storage-3

Then create the initial monitors::

    ceph-deploy mon create-initial

Next, add the OSDs. You'll want an SSD with a journal partition for each
OSD(``/dev/sdb#``), and an HDD for each OSD::

    ceph-deploy osd create stack-storage-1:/dev/sdc:/dev/sdb1 stack-storage-1:/dev/sdd:/dev/sdb2 \
        stack-storage-2:/dev/sdc:/dev/sdb1 stack-storage-2:/dev/sdd:/dev/sdb2 \
        stack-storage-3:/dev/sdc:/dev/sdb1 stack-storage-3:/dev/sdd:/dev/sdb2

Now copy the configuraton file & admin key to the controller & storage nodes::

    ceph-deploy admin stack-controller-1 stack-controller-2 \
        stack-storage-1 stack-storage-2 stack-storage-3

And set the correct permissions on the admin key::

    # Do this on every node
    sudo chmod +r /etc/ceph/ceph.client.admin.keyring

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

    # For each Controller node
    ceph auth get-or-create client.glance | ssh stack-controller-1 sudo tee /etc/ceph/ceph.client.glance.keyring
    ssh stack-controller-1 sudo chown glance:glance /etc/ceph/ceph.client.glance.keyring
    ceph auth get-or-create client.glance | ssh stack-controller-2 sudo tee /etc/ceph/ceph.client.glance.keyring
    ssh stack-controller-2 sudo chown glance:glance /etc/ceph/ceph.client.glance.keyring

    # For each Compute Node
    ceph auth get-or-create client.cinder | ssh stack-compute-1 sudo tee /etc/ceph/ceph.client.cinder.keyring

    # For each Storage node
    ceph auth get-or-create client.cinder | ssh stack-storage-1 sudo tee /etc/ceph/ceph.client.cinder.keyring
    ssh stack-storage-1 sudo chown cinder:cinder /etc/ceph/ceph.client.cinder.keyring
    ceph auth get-or-create client.cinder | ssh stack-storage-2 sudo tee /etc/ceph/ceph.client.cinder.keyring
    ssh stack-storage-2 sudo chown cinder:cinder /etc/ceph/ceph.client.cinder.keyring
    ceph auth get-or-create client.cinder | ssh stack-storage-3 sudo tee /etc/ceph/ceph.client.cinder.keyring
    ssh stack-storage-3 sudo chown cinder:cinder /etc/ceph/ceph.client.cinder.keyring


Copy the ``ceph.conf`` to the Compute nodes(it should already be present on the
other nodes)::

    ssh stack-compute-1 sudo tee /etc/ceph/ceph.conf < /etc/ceph/ceph.conf

Display the secret key for the ``client.cinder`` ceph user and add it to the
ansible password vault as ``vaulted_rbd_cinder_key``::

    ceph auth get-key client.cinder

Generate a UUID to use for the ``libvirt`` secret using ``uuidgen``. Add the
UUID to the ansible password vault as ``vaulted_rbd_cinder_uuid``. Make sure to
re-run the ansible playbook for the compute nodes so the libvirt secret is
added(``ansible-playbook acorn.yml -t compute``).

Finally, restart the OpenStack services::

    # On Controller
    systemctl restart glance-api
    # On Compute
    systemctl restart nova-compute
    # On Storage
    systemctl restart cinder-volume

Test the setup::

    # On Controller
    source acorn-openrc.sh

    # Add an Image
    openstack image create cirros --file cirros.raw --disk-format raw --container-format bare --public
    rbd -p images ls

    # Create a Volume
    openstack volume create --size 10 test-vol
    rbd -p volumes ls


High Availability Initialization
=================================

Some manual setup is required for highly available controller nodes.  You
should have only one controller node for this initial setup. Add additional
controller nodes after setting up the OpenStack cluster for the first time.


Pacemaker
----------

Ansible only installs the Pacemaker & HAProxy packages. You will need to create
the cluster & Virtual IP address when first creating the OpenStack cluster.

Start by removing the initial config file & authenticating the controller
node::

    sudo rm /etc/corosync/corosync.conf
    sudo pcs cluster auth stack-controller-1 -u hacluster -p PASSWORD --force

Stop Pacemaker then create, start, & enable
the cluster::

    sudo systemctl stop pacemaker corosync
    sudo pcs cluster setup --force --name acorn-controller-cluster stack-controller-1
    sudo pcs cluster start --all
    sudo pcs cluster enable --all

Set some basic properties::

    sudo pcs property set pe-warn-series-max=1000 \
        pe-input-series-max=1000 \
        pe-error-series-max=1000 \
        cluster-recheck-interval=3min

Disable STONITH for now::

    sudo pcs property set stonith-enabled=false

Create the Virtual IP Address::

    sudo pcs resource create management-vip ocf:heartbeat:IPaddr2 \
        params ip="10.5.1.10" cidr_netmask="24" op monitor interval="30s"

Add HAProxy to the cluster & only serve the VIP when HAProxy is running::

    sudo pcs resource create lb-haproxy systemd:haproxy --clone --force
    sudo pcs constraint order start management-vip then lb-haproxy-clone kind=Optional
    sudo pcs constraint colocation add lb-haproxy-clone with management-vip

Add the Keystone service to Pacemaker::

    sudo pcs resource create keystone keystone --clone interleave=true

Add the Glance service to Pacemaker::

    sudo pcs resource create glance-api glance-api --clone

Add the Cinder service to Pacemaker::

    sudo pcs resource create cinder-api cinder-api --clone interleave=true
    sudo pcs resource create cinder-scheduler cinder-scheduler --clone interleave=true


MySQL
------

Stop the mysql server on the controller node & start it as a cluster::

    sudo systemctl stop mysql
    sudo galera_new_cluster


High Availability
==================

See the `High Availability Guide`_ for reference.

For setup directions, see the ``High Availability Initialization`` and ``Adding
Nodes`` sections.


Compute nodes are not setup for high availability, there is currently no
automated relaunching of VMs on failed Compute nodes.

Storage nodes use Ceph for distributed storage & high availability. An odd
number of 3 or more storage nodes is recommended.

Controller nodes are have various services for High Availability. Pacemaker is
used to share a virtual IP address between all Controller nodes. When a node
goes down, another node adopts the virtual IP.

OpenStack services & endpoints are made highly available via HAProxy. HAProxy
takes requests to the virtual IP address and distributes them across all
available controller nodes.

RabbitMQ, Memcached, & MySQL are all clustered as well. RabbitMQ & Memcached
use other nodes as failovers, while MySQL uses Galera for replication & HAProxy
for handling failovers.


TODO: Do memcached urls for openstack service auth & horizon need configuration?


Automated Maintenance
======================

There is a `Fabric`_ file that can be used to automatically update and upgrade
the cluster servers::

    fab upgrade

TODO: Fabric command to check & bootstrap inactive galera cluster?


Architecture
=============

Currently, we use a single Controller node along with multiple Compute and
Storage nodes. Neutron is setup to support self-service networks.

Eventually a High Availability setup will be implemented, along with image
storage on the storage nodes(instead of controllers).

TODO: Investigate Cinder Backup


Nodes
------

The controller nodes run the following services:

* cinder-api
* cinder-scheduler
* conva-novncproxy
* glance-api
* glance-registry
* neutron-dhcp-agent
* neutron-l3-agent
* neutron-linuxbridge-agent
* neutron-metadata-agent
* neutron-server
* nova-api
* nova-conductor
* nova-consoleauth
* nova-scheduler

The compute nodes run the following services:

* neutron-linuxbridge-agent
* nova-compute

The storage nodes run the following services:

* ceph-mon
* ceph-osd
* cinder-volume
* tgt


Network Setup
--------------

Our public address space is on ``192.168.1.0/24`` while the internal management
network is on ``10.5.1.0/24`` and the storage network is on ``10.6.1.0/24``. IP
addressing of nodes is done manually in ``/etc/network/interfaces/``.

**Public Network**

``192.168.1.0/24``

* ``190`` to ``193`` are the Controller nodes, with ``190`` being reserved for
  the virtual IP of the current master controller.
* ``194`` to ``196`` are the Compute nodes.
* ``197`` to ``199`` are the Storage nodes.

**Management Network**

``10.5.1.0/24``

* ``10`` to ``19`` reserved for Controller nodes.
* ``20`` to ``29`` reserved for Compute nodes.
* ``30`` to ``39`` reserved for Storage nodes.

**Storage Network**

``10.6.1.0/24``

* ``10`` to ``19`` for OSD nodes.


Ceph
-----

Ceph is used for high availability image & block storage. Administration is
done with ``ceph`` and ``ceph-deploy`` on controller nodes. Each controller
node runs a monitor daemon and each storage node runs one OSD daemon per
storage disk.


.. _OpenStack Newton:               https://docs.openstack.org/newton/
.. _Ubuntu pre-seed file:           https://help.ubuntu.com/lts/installation-guide/armhf/apbs03.html
.. _Ansible:                        https://www.ansible.com/
.. _Ubuntu Automated Installer:     https://help.ubuntu.com/lts/installation-guide/armhf/apb.html
.. _Ubuntu Mini Image:              http://www.ubuntu.com/download/alternative-downloads
.. _High Availability Guide:        https://docs.openstack.org/ha-guide/
.. _Fabric:                         http://www.fabfile.org/
