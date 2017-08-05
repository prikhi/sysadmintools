=================
Acorn VM Cluster
=================

The ``vm_cluster`` folder contains files relevant to administration of Acorn's
VM cluster, which runs on `OpenStack Newton`_ with Ubuntu nodes.


TODO: Update OpenStack to Ocata
TODO: Setup & test routing between mgmt network, user lan, & wan


Automated Installs
===================

The initial OS install is automated using a `Ubuntu pre-seed file`_. This will
install a basic Ubuntu SSH server onto a node.

Then some manual setup is required to setup ``sudo`` access & the network
interfaces.

The OpenStack configuration is automated using an `Ansible`_ playbook, the
Pacemaker failover for the controllers & the Ceph storage cluster require some
manual setup when first initializing the cluster and when adding new nodes.

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

The network connections & IP addresses must be setup by manually. Refer to the
`Network Setup` section & ``hardware.rst`` file for the interface & IP range to
use for each network & node type. Configure the networks by editing
``/etc/network/interfaces``::

    # TODO: Remove this for final install since public routed through mgmt
    # The primary public interface
    auto enp0s3
    iface enp0s3 inet dhcp

    # The Management Network Interface
    auto enp0s8
    iface enp0s8 inet static
        address 10.2.1.11
        netmask 255.255.255.0

On controller & compute nodes, add the Provider & Overlay Network Interfaces::

    # The Provider Network Interface
    auto enp0s9
    iface enp0s9 inet manual
    up ip link set $IFACE up
    down ip link set $IFACE down

    # The Overlay Network Interface
    auto enp0s10
    iface enp0s10 inet static
        address 10.3.1.11
        netmask 255.255.255.0


On controller, compute, & storage nodes, add the Storage Network Interface::

    auto enp0s11
    iface enp0s11 inet static
        address 10.4.1.11
        netmask 255.255.255.0

On storage nodes, add the Storage Sync Network::

    auto enp0s12
    iface enp0s12 inet static
        address 10.5.1.71
        netmask 255.255.255.0

Then restart the networking service::

    sudo systemctl restart networking


Ansible Playbook
-----------------

The Ansible playbook is a series of tasks(grouped into roles) that ensure
OpenStack is installed & properly configured. The playbook currently has a
``common`` role for all nodes, as well as specific roles for ``controller`` and
``compute`` nodes.

The ``cluster-servers`` file specifies the address, name and node type of each
of our OpenStack servers. Currently there are three controller nodes, three
compute nodes, & three storage nodes.

You can run the playbook by installing ansible with pip and using the
``ansible-playbook`` command inside the ``playbook`` directory::

    sudo pip install ansible
    cd playbook
    ansible-playbook acorn.yml


Initialize Cluster Setup
-------------------------

See ``initialization.rst``.

Adding Nodes to a Cluster
--------------------------

See ``maintenance.rst``.


High Availability
==================

See the `High Availability Guide`_ for reference.

For setup directions, see the ``High Availability Initialization`` section and
the ``Cluster Expansion`` section in ``maintenance.rst``.


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
* cinder-volume
* tgt
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
* nova-novncproxy
* nova-scheduler

The compute nodes run the following services:

* neutron-linuxbridge-agent
* nova-compute

The storage nodes run the following services:

* ceph-mon
* ceph-osd


Network Setup
--------------

Our public address space is on ``192.168.1.0/24`` while the overlay network is
on ``10.4.1.0/24``, the internal management network is on ``10.5.1.0/24``, and
the storage network is on ``10.6.1.0/24``. IP addressing of nodes is done
manually in ``/etc/network/interfaces/``.

TODO: Expand network ranges so we can have more than 9 of each node.

**Public Network**

TODO: Unecessary when access is enabled on management network by our router.

``192.168.1.0/24``

* ``190`` to ``193`` are the Controller nodes, with ``190`` being reserved for
  the virtual IP of the current master controller.
* ``194`` to ``196`` are the Compute nodes.
* ``197`` to ``199`` are the Storage nodes.

**Management Network**

``10.2.1.0/24``

* ``10`` is reserved for the Master Controller's Virtual IP.
* ``11`` to ``40`` reserved for Controller nodes.
* ``41`` to ``70`` reserved for Compute nodes.
* ``71`` to ``100`` reserved for Storage nodes.

**Overlay Network**

``10.3.1.0/24``

* ``11`` to ``40`` reserved for Controller nodes.
* ``41`` to ``70`` reserved for Compute nodes.

**Storage Network**

``10.4.1.0/24``

* ``11`` to ``40`` for Controller nodes.
* ``41`` to ``70`` for Compute nodes.
* ``71`` to ``100`` for Storage nodes.

**Storage Sync Network**

``10.5.1.0/24``

* ``71`` to ``100`` for OSD nodes.


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
