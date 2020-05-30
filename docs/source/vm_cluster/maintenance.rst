.. _cluster-maintenance:

===================
Cluster Maintenance
===================


Cluster Status
===============

There are various commands and log files that you can use to assess the
cluster's health & status.

Pacemaker
----------

The controller nodes run ``pacemaker`` to share the virtual IP address for the
``stack-master-controller.acorn`` domain. Only one controller node will be the
master-controller at once. Pacemaker also ensures various services like the
load balancer ``haproxy`` are running.

To check the status of the Pacemaker cluster, run ``sudo pcs status`` on any
controller node. This will display the node with the master-controller virtual
IP and the status of services on each controller node.

To restart the pacemaker service on a controller node, run ``sudo systemctl
restart pacemaker``. Log files for the service can be found at
``/var/log/pcsd/`` and you can run ``sudo journalctl -u pacemaker`` for
additional service information.

MySQL
------

The MySQL database is replicated on each controller node. You can check a
node's status in the cluster by running ``sudo mysql`` to open an SQL shell,
and then run a ``SHOW STATUS LIKE 'wsrep_local_state%';`` query. A state
comment of ``Synced`` means the node is synced with the rest of the cluster.
You can check the logs by running ``sudo journalctl -u mariadb``.

Ceph
-----

The controller nodes are the monitors & manager for the Ceph storage cluster
used by OpenStack.

To check the health of the storage cluster, run ``ceph health``. For more
detailed information, run ``ceph status``. While the cluster is being
re-balanced or repaired, you can run ``ceph -w`` to print the status and then
monitor any health-related messages. Run ``ceph iostat`` to continuously print
a table of the cluster's I/O activity.

The storage nodes have a Ceph OSD for each storage drive. To print the layout
of storage nodes & OSDs, run ``ceph osd tree``. For more detailed information
like the used & available space per-OSD, run ``ceph osd status``.

Ceph log files are found in ``/var/log/ceph/`` on the controller & storage
nodes. You can view the ceph services running on each node by running
``systemctl``. To restart all ceph services on a node, run ``sudo systemctl
restart ceph.target``. You can start a specific OSD by SSHing into the OSDs
storage node and running something like ``sudo systemctl start
ceph-osd@2.service``.

OpenStack
----------

You can check the status of openstack services & VMs by using the ``openstack``
command from any controller node. You will need to source one of the credential
files on the node, e.g.: ``. ~/admin-openrc.sh``.

Check the available services using ``openstack service list``. Check the
hypervisor services with ``openstack compute service list`` and the networking
services with ``openstack network agent list``. Check the hypervisor stats with
``openstack hypervisor stats show`` and the per-hypervisor resources with
``openstack hypervisor list --long``.

Source the ``~/acorn-openrc.sh`` credential file to display details of the
acorn project. ``openstack server list`` will show all VMs and their status.
Similarly, run ``openstack volume list`` for all volumes, ``image list`` for
all images, & ``flavor list`` for all VM flavors.

See ``openstack --help`` for all available commands and flags.


Automated Maintenance
======================

There is a `Fabric`_ file that can be used to automatically update and upgrade
the cluster servers::

    fab upgrade

TODO: Fabric command to check & bootstrap inactive galera cluster?

.. _Fabric:                         http://www.fabfile.org/


Adding OS Images
=================

You can download `pre-made images`_ or `create your own image`_ for Linux &
Windows VMs using a virtualizer like KVM or VirtualBox.

Once you have an image file, you need to convert it to the ``raw`` format using
``qemu-img``::

    qemu-img convert -O raw my-src-image.qcow2 my-target-image.raw

Then you can add the image to the cluster via the Dashboard:

* Login to the `Dashboard`_ using the admin credentials.
* Under the ``Admin`` menu, select ``Compute`` and ``Images``.
* Click ``Create Image``, give it a name and description, select your raw image
  file, and change the format to ``Raw``.
* Hit ``Create Image`` to upload the image file.
* Once complete, you should be able to switch to the ``acorn`` project & launch
  a VM using your new image.

.. _pre-made images:                https://docs.openstack.org/image-guide/obtain-images.html
.. _create your own image:          https://docs.openstack.org/image-guide/create-images-manually.html
.. _Dashboard:                      http://stack-master-controller.acorn/horizon/


Adding VM Flavors
==================

Flavors let you set the available resources for a VM. You can customize the CPU
count, RAM, swap, & OS drive size.

* Login to the `Dashboard`_ using the admin credentials.
* Under the ``Admin`` menu, select ``Compute`` and ``Flavors``.
* Hit the ``Create Flavor`` button.
* Name the flavor and specify the resources sizs, then hit ``Create Flavor``.


Adding / Replacing Storage Drives
==================================

When a storage node's OS drive fails, you need to replace the drive, create a
new 1 volume RAID array using the Adapatec Configuration boot utility.

When a storage drive fails, you will need to shutdown the node, swap the drive
out, & initialize the new JBOD drive:

* SSH into a controller node and run ``ceph osd set noout`` to prevent
  rebalancing when you take the storage node offline.
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
* Run ``ceph osd unset noout`` to enable data rebalancing on drive failure.
* Login to the `Dashboard`_ using the admin credentials.
* Ensure you are viewing the ``admin`` project. Under the ``Identity`` menu,
  navigate to the ``Projects`` page.
* Click the dropdown for the ``acorn`` project and select ``Modify Quotas``.
* Click the ``Volume`` tab and enter the new ``Total Size`` of the cluster,
  using the ``Safe Cluster Size`` value from the `Ceph Calculator`_.
* Hit the ``Save`` button.

.. _Ceph Calculator:                https://florian.ca/ceph-calculator/


Extending a Volume
===================

If a VM's volume is running out of free space, you can extend the volume to
increase it's total size:

* SSH into the VM & shut it down.
* Login to the `Dashboard`_ & navigate to the ``Instances`` page under the
  ``Project > Compute`` menu.
* Click the dropdown menu for the VM and click the ``Detach Volume`` option and
  select the desired volume.
* Navigate to the ``Volumes`` page under the ``Volumes`` menu.
* Use the dropdown menu for the volume to resize the volume.
* Once the volume is resized, re-attach it to the VM and boot up the VM.
* SSH into the VM.
* Unmount the volume by running ``sudo umount <mount-point>`` or ``sudo umount
  /dev/<volume-disk>``. Run ``mount`` to see a list of all mounted drives on
  the system.
* Run ``gdisk /dev/<volume-disk>`` to partition the new drive.
* We need to delete the existing partition and create an identical one that
  fills up the entire disk partition. If there is only one partition, you can
  enter ``d`` to delete it, then ``n`` to create a new one and accept the
  defaults in the following prompts by hitting ``<Enter>`` to make it take the
  entire disk. Then enter ``w`` to write the new parition table.
* Run ``sudo partprobe`` to pickup the partition table changes.
* Run ``sudo ressize2fs /dev/<volume-partition>`` to extend the filesystem to
  the new partition size.


Shutting Down
==============

To shutdown a cluster:

* Shutdown all the VMs using the web UI or with the ``openstack server stop
  <server1> <server2> ...`` command from a controller node.
* SSH into the Compute nodes and shut them down by running ``sudo poweroff``.
* On a controller node, disable storage rebalancing so we can take the storage
  cluster offline by running ``ceph osd set noout``.
* SSH into each Storage node and shut them down.
* On a controller node, put the pacemaker cluster into maintenance mode by
  running ``pcs property set maintenance-mode=true``.
* Shut off the controller nodes in a staggered fashion from node 3 to node 1.
  E.g., shutdown ``stack-controller-3``, wait a minute, shutdown 2, wait a
  minute, shutdown 1.


Starting Up
============

If you ever need to start a stopped cluster:

* Start up the Master Controller Node
* If this was the last node shutdown, run ``sudo galera_new_cluster``.
* If you don't know which controller shutdown last, check
  ``/var/lib/mysql/grastate.dat`` on each controller for ``safe_to_bootstrap:
  1``. Run ``sudo galera_new_cluster`` on this controller.
* Once the first MySQL server starts, start mysql on the other nodes by running
  ``systemctl start mysql``.
* Now start the Storage nodes. Verify all disks are up by running ``ceph osd
  tree`` on a controller node. Check the health of the storage cluster by
  running ``ceph status``.
* On a controller node, re-enable drive re-balancing by running ``ceph osd
  unset noout``.
* Start the Compute nodes.
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

And finally, copy over the ``~/ceph-cluster`` folder from an existing
controller node to a new one::

    # On stack-controller-1
    rsync -avhz ~/ceph-cluster stack-controller-4:~/


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

Follow the :ref:`setup-and-config` instructions, then add the hostname to the
``storage`` group in the ``cluster-servers`` file and run the ansible playbook.

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
