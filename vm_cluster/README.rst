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
        address 10.5.1.10
        netmask 255.255.255.0

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


Adding Nodes
=============

Adding additional compute and storage nodes is fairly straightforward.

Compute
--------

Simply follow the setup instructions, making sure to add the hostname to the
``compute`` group in the ``custer-servers`` hosts file. The ansible playbook
should handle the rest, and OpenStack should pickup the additional compute node
afterwards.

You can verify the setup by running ``openstack compute service list``
on a controller node. The list should include the new compute host.


Ceph Initialization
====================

Ansible only installs the ``ceph-deploy`` tool on controller nodes, Ceph
cluster initialization must be done manually, but only on creation of the
OpenStack cluster. If you are simply adding additional nodes to an existing
cluster, you can skip this section.

Ceph Setup
-----------

Start by SSHing into the master controller, generate an SSH key & copy it to the Storage nodes::

    ssh-keygen -t ecdsa -b 521
    ssh-copy-id stack-storage-1
    ssh-copy-id stack-storage-2
    ssh-copy-id stack-storage-3

Now create a directory for the cluster configuration::

    mkdir ~/acorn-cluster
    cd ~/acorn-cluster

Deploy the initial cluster with the Storage nodes as monitors(eventually we
will use the controllers for this, but we don't have HA controllers yet)::

    ceph-deploy new stack-storage-1 stack-storage-2 stack-storage-3

TODO: Use controllers as monitors when we have HA controller nodes set up.

Open up the ``ceph.conf`` in ``~/acorn-cluster/`` and add the cluster network
setting::

    cluster network = 10.6.1.0/24

Install Ceph on the storage nodes::

    ceph-deploy install stack-controller-1 stack-storage-1 stack-storage-2 stack-storage-3

Then create the initial monitors::

    ceph-deploy mon create-initial

Next, add the OSDs. You'll want an SSD with a journal partition for each
OSD(``/dev/sdb#``), and an HDD for each OSD::

    ceph-deploy osd create stack-storage-1:/dev/sdc:/dev/sdb1 stack-storage-1:/dev/sdd:/dev/sdb2 \
        stack-storage-2:/dev/sdc:/dev/sdb1 stack-storage-2:/dev/sdd:/dev/sdb2 \
        stack-storage-3:/dev/sdc:/dev/sdb1 stack-storage-3:/dev/sdd:/dev/sdb2

Now copy the configuraton file & admin key to the controller & storage nodes::

    ceph-deploy admin stack-controller-1 stack-storage-1 stack-storage-2 stack-storage-3

And set the correct permissions on the admin key::

    # Do this on every node
    sudo chmod +r /etc/ceph/ceph.client.admin.keyring

Check the health of the storage cluster with ``ceph health`` & watch syncing
progress with ``ceph -w``.


OpenStack Integration
----------------------

Now we'll make OpenStack use the Ceph cluster for Image & Block storage. Start
by creating some pools to use::

    ceph osd pool create volumes 128
    ceph osd pool create images 128
    ceph osd pool create vms 128

Create Ceph Users for the various OpenStack Services, and assign them the
appropriate pool permissions::

    ceph auth get-or-create client.glance mon 'allow r' osd 'allow class-read object_prefix rbd_children, allow rwx pool=images'
    ceph auth get-or-create client.cinder mon 'allow r' osd 'allow class-read object_prefix rbd_children, allow rwx pool=volumes, allow rwx pool=vms, allow rwx pool=images'

Then copy them to your nodes::

    # For each Controller node
    ceph auth get-or-create client.glance | ssh stack-controller-1 sudo tee /etc/ceph/ceph.client.glance.keyring
    ssh stack-controller-1 sudo chown glance:glance /etc/ceph/ceph.client.glance.keyring

    # For each Compute Node
    ceph auth get-or-create client.cinder | ssh stack-compute-1 sudo tee /etc/ceph/ceph.client.cinder.keyring

    # For each Storage node
    ceph auth get-or-create client.cinder | ssh stack-storage-1 sudo tee /etc/ceph/ceph.client.cinder.keyring
    ssh stack-storage-1 sudo chown cinder:cinder /etc/ceph/ceph.client.cinder.keyring


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


High Availability
==================

Haven't experimented with this yet, see the `High Availability Guide`_ for reference.


Automated Maintenance
======================

There is a `Fabric`_ file that can be used to automatically update and upgrade
the cluster servers::

    fab upgrade


Architecture
=============

Currently, we use a single Controller node along with multiple Compute and
Storage nodes. Neutron is setup to support self-service networks.

Eventually a High Availability setup will be implemented, along with image
storage on the storage nodes(instead of controllers).


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
