=================
Acorn VM Cluster
=================

The ``vm_cluster`` folder contains files relevant to administration of Acorn's
VM cluster, which runs on `OpenStack Newton`_ with Ubuntu nodes.

Currently, we use a single Controller node along with multiple Compute and
Storage nodes. Neutron is setup to support self-service networks.

Our public address space is on ``192.168.1.0/24`` while the internal management
network is on ``10.5.1.0/24``. IP addressing of nodes is done manually in
``/etc/network/interfaces/``.

Eventually a High Availability setup will be implemented, along with image
storage on the storage nodes(instead of controllers).


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

Storage Setup
--------------

Storage nodes must have their storage devices setup in an LVM volume group
named ``cinder-volumes``::

    apt-get install lvm2
    # Create a Physical Volume on /dev/sdb
    pvcreate /dev/sdb
    # Create Volume Group for Cinder
    vgcreate cinder-volumes /dev/sdb

Add a filter to the ``devices`` section in ``/etc/lvm/lvm.conf``::

    devices {
        # ...
        filter = [ "a/sda/", "a/sdb/", "r/.*/"]
    }

It's recommended to use RAID along with LVM:
https://wiki.archlinux.org/index.php/Software_RAID_and_LVM

Ansible Playbook
-----------------

The Ansible playbook is a series of tasks(grouped into roles) that ensure
OpenStack is installed & properly configured. The playbook currently has roles
for ``controller`` and ``compute`` nodes.

The ``cluster-servers`` file specifies the address, name and node type of each
of our OpenStack servers. Currently there is only a single controller & a
single compute node, which are guests on a DevStack hypervisor.

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


High Availability
==================

Haven't experimented with this yet, see the `High Availability Guide`_ for reference.


Automated Maintenance
======================

There is a `Fabric`_ file that can be used to automatically update and upgrade
the cluster servers::

    fab upgrade


.. _OpenStack Newton:               https://docs.openstack.org/newton/
.. _Ubuntu pre-seed file:           https://help.ubuntu.com/lts/installation-guide/armhf/apbs03.html
.. _Ansible:                        https://www.ansible.com/
.. _Ubuntu Automated Installer:     https://help.ubuntu.com/lts/installation-guide/armhf/apb.html
.. _Ubuntu Mini Image:              http://www.ubuntu.com/download/alternative-downloads
.. _High Availability Guide:        https://docs.openstack.org/ha-guide/
.. _Fabric:                         http://www.fabfile.org/
