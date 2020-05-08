.. _cluster-maintenance:

===================
Cluster Maintenance
===================


Automated Maintenance
======================

There is a `Fabric`_ file that can be used to automatically update and upgrade
the cluster servers::

    fab upgrade

TODO: Fabric command to check & bootstrap inactive galera cluster?

.. _Fabric:                         http://www.fabfile.org/


Adding / Replacing Storage Drives
==================================

When a storage node's OS drive fails, you need to replace the drive, create a
new 1 volume RAID array using the Adapatec Configuration boot utility.

When a storage drive fails, you will need to shutdown the node, swap the drive
out, & initialize the new JBOD drive:

* Run ``sudo poweroff`` on the storage node to shut it off.
* Swap out the HDD with a replacement drive. We use 3TB SAS drives.
* Power the node back on.
* During the boot process, you will receive an error from the RAID card stating
  the drive configuration has changed. Press ``Control-a`` to enter the RAID
  setup.
* Select the RAID adapter that controls the new drive.
* Select the ``Initialize Drives`` option & select the new drive with ``Space``
  and then press ``Enter`` to confirm.
* Press ``Escape`` to go back to the menu and select ``Create JBOD``.
* Select the new drive and confirm the JBOD creation.
* Exit the menu to boot into the OS.
* Once the storage node has booted up, SSH into ``stack-controller-1.acorn``.
* Enter the Ceph Deploy directory with ``cd ceph-cluster`` and deploy an OSD to
  the replacement drive by running ``ceph-deploy osd create
  stack-storage-<node-number> --data /dev/<new-drive>``.


Starting Up
============

If you ever need to start a stopped cluster:

* Start up the Master Controller Node
* If this was the last node shutdown, run ``sudo galera_new_cluster``.
* If you don't know which controller shutdown last, check
  ``/var/lib/mysql/grastate.dat`` on each controller for ``safe_to_bootstrap:
  1``. Run ``sudo galera_new_cluster`` on this controller.
* Once the first MySQL server starts, you can start up all the other nodes.
* Once everything has booted up, you should be able to start the VMs from the
  dashboard.


Shutting Down
==============

If you need to shutdown the cluster(e.g., in case of a power outage), do so in
the following order:

* VMs
* Compute Nodes
* Storage Nodes
* Backup Controller Nodes
* Master Controller Node


.. _cluster-expansion:

Cluster Expansion
==================

Adding additional controller, compute, or storage nodes to a cluster is fairly
straightforward.

For every node, you should first follow the :ref:`node-setup` section. Then add
the host to a group in the ``cluster-servers`` file & add a config file in
``host_vars/`` (base it off of the configs for other hosts in that group).

Then run the full ansible playbook::

    ansible-playbook acorn.yml

Controller
-----------

New controllers require some manual configuration due to the high availability
setup.

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

Pacemaker
++++++++++

You'll need to authenticate the new node from the master controller::

    # On stack-controller-1
    sudo pcs cluster auth -u hacluster stack-controller-4

Next, remove the default cluster from the new node::

    # On stack-controller-4
    sudo pcs cluster destroy

Add the new node using the master controller and start the service on the new
node::

    # On stack-controller-1
    sudo pcs cluster node add stack-controller-4

    # On stack-controller-4
    sudo pcs cluster start
    sudo pcs cluster enable

Ceph
+++++

Copy the SSH key from the master controller to the new controller::

    # On stack-controller-1
    ssh-copy-id stack-controller-4

Install & deploy Ceph on the new controller node::

    # On stack-controller-1
    cd ~/storage-cluster
    ceph-deploy install --repo-url http://download.ceph.com/debian-luminous stack-controller-4
    ceph-deploy admin stack-controller-4

Setup the new controller as a Ceph monitor::

    ceph-deploy mon add stack-controller-4


Copy the Glance Key to the new controller node::

    # On stack-controller-1
    ceph auth get-or-create client.glance | ssh stack-controller-4 sudo tee /etc/ceph/ceph.client.glance.keyring
    ssh stack-controller-4 sudo chown glance:glance /etc/ceph/ceph.client.glance.keyring

**Extra Deploy Node**

Copy the SSH key from each existing controller to the new controller::

    ssh-copy-id stack-controller-4

Then initialize a key on the new server & copy it to the existing controller
and storage nodes::

    ssh-keygen -t ecdsa -b 521
    ssh-copy-id stack-controller-1
    ssh-copy-id stack-controller-2
    ssh-copy-id stack-controller-3
    ssh-copy-id stack-compute-1
    ssh-copy-id stack-compute-2
    ssh-copy-id stack-compute-3
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


Compute
--------

The ansible playbook should handle all the required setup and OpenStack should
pickup the additional compute node afterwards.

You can verify this by running ``openstack compute service list`` on a
controller node. The list should include the new compute host.


Storage
--------

Follow the installation & manual setup instructions, then add the hostname to
the ``storage`` group in the ``cluster-servers`` file and run the ansible
playbook.

This will install Ceph and setup Cinder, but you'll need to manually add the
new node and any new storage drives to our Ceph cluster.

Start by pushing the SSH key from the master controller to the new node::

    # On stack-controller-1
    ssh-copy-id stack-storage-4

Then use ``ceph-deploy`` on the master controller to install Ceph on the new
node::

    cd ~/storage-cluster
    ceph-deploy install --repo-url http://download.ceph.com/debian-luminous stack-storage-4

Note that we use ``--repo-url`` here instead of the ``--release`` flag, so that
packages are downloaded through HTTP instead of HTTPS, which allows them to be
cached by our web proxy.

Deploy an OSD to each new storage disk. It's recommended to split the journals
out on a separate SSD with a partition for each OSD::

    ceph-deploy disk list stack-storage-4
    ceph-deploy osd create stack-storage-4:/dev/sdc:/dev/sdb1 stack-storage-4:/dev/sdd:/dev/sdb2

You can monitor the rebalancing progress by running ``ceph -w`` on
stack-controller-1.
