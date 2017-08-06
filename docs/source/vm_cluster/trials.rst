=================================
Appendix: Notes From Setup Trials
=================================


These are notes from various initial setup attempts we went through as we built
our final configuration.


3/9/17 Test
============

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
=============

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


5/1/17 Test 1
==============

Testing setup of all nodes at once. Started with fresh install from preseed
file on 2 controllers, 1 compute, & 3 storage nodes.

Ran playbook once, expected failure when restarting mysql for first time, since
no cluster was initialized.

Setup master controller & then restarted mysql on backup::

    # On stack-controller-1
    sudo galera_new_cluster

    # On stack-controller-2
    sudo systemctl restart mysql

Then ran playbook again. Failed at retrieving openstack user list. Followed
high availability setup instructions.

Then ran playbook again, finished fine. Followed with Ceph Initialization.

After Ceph finished, verified all services from master controller::

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
    openstack flavor create --id 0 --vcpus 1 --ram 64 --disk 1 m1.nano
    . acorn-openrc.sh
    openstack security group rule create --proto icmp default
    openstack security group rule create --proto tcp --dst-port 22 default
    openstack network list
    PRIVATE_NETWORK_ID="$(openstack network list -f value -c ID -c Name | grep private | cut -f1 -d' ')"
    openstack server create --flavor m1.nano --image cirros \
        --nic net-id=$PRIVATE_NETWORK_ID --security-group default test-instance
    openstack server list
    openstack floating ip create provider   # Check the created IP
    FLOATING_IP="$(openstack floating ip list -c 'Floating IP Address' -f value)"
    openstack server add floating ip test-instance $FLOATING_IP
    echo $FLOATING_IP
    # Should be able to ssh in as `cirros` w/ password `cubswin:)`


5/1/17 Test 2
==============

Rolled back to pre-ansible snapshots, ran playbook. Failed at mysql.

Initialized mysql cluster, then ran high availability playbook::

    ansible-playbook acorn.yml -t ha

After completion, followed HA initialization setup. Re-ran full playbook.
Controller 1 failed when trying to query networks. Had to modify playbook to
flush handlers before setting up projects/networks. Rolled back to initial
snapshot, re-tested & working OK now.

Ran Ceph initialization & verified cluster operation. Verification failed at
compute service list, had to sync nova db & restart nova-compute on compute
node. Failed again on volume service list due to unsync'd time, had to sync &
restart::

    sudo chronyc -a makestep
    sudo systemctl cinder-volume restart


6/5/17 Additions
=================

These changes been tested in a fresh install, but will be necessary next time
we try.

On controllers::

    sudo ovs-vsctl add-br br-provider

On computes::

    sudo ovs-vsctl add-br br-provider
    sudo ovs-vsctl add-port br-provider PROVIDER_INTERFACE

Verify distributed self-service networking:
https://docs.openstack.org/newton/networking-guide/deploy-ovs-ha-dvr.html#verify-network-operation


6/6/17 Test
============

For testing DVR networking. Started w/ fresh preseed installs & all nodes
running.

Ran playbook, controllers failed at mysql as expected. Initialized mysql
cluster on controller-1. Started mysql on controller-2 afterwards.

Ran playbook. Failed at querying users for glance(since no VIP). Did HA setup.

Ran playbook. Failed at creating network. Did OVS setup & restarted
``neutron-openvswitch-agent`` & ``neutron-metadata-agent`` on controller &
compute.

Ran playbook, everything passed. Did Ceph setup.

Verified everything, failed at assigning floating ip, had to restart
``neutron-l3-agent`` on compute nodes. Failed to ping from public LAN, tried
some playbook tweaks & debugging but ended up rolling back to snapshot.
Probably old config messing stuff up.


6/7/17 Test
============

Try to get DVR working again....

Ran playbook, failed at mysql. Started cluster. Ran ``ha`` tags, setup
pacemaker & OVS bridge.

Ran playbook, failed at creating neutron user. Re-ran playbook & it
completed past that(maybe due to low resources?)

But failed at creating Router. Restarted neutron-metadata-agent on controllers
& it completed(added restart to playbook).

Ran ``pcs resource cleanup`` to refresh pacemaker status.

Setup Ceph. Verified operation, can SSH into instance & ping internet.


8/4/17 Test
============

Test moving cinder-volume to controller nodes. 2 controllers, 1 compute, 2
storage.

Followed :ref:`cluster-initialization`. Verified as working.
