===============
IT Architecture
===============


Our local network is run on a 10Gb/s switch that splits out to 1Gb ethernet
connections. Additional buildings are connected via ENH202 wifi bridges.

Our internet connection runs at a dedicated 3Mb/s with a burst of up to 10Mb/s.

Our router is called ``Cerberus`` - it runs FreeBSD and runs the Packet Filter
firewall, NAT, DHCP, BIND DNS, Samba WINS, & a Squid Web Proxy.

Our servers runs Slackware Linux - we have ``Vishnu``, our Database server,
``Aphrodite``, our general server, & ``Adonis``, our backup server.

Vishnu contains our Business files & is backed up hourly, daily, monthly, &
yearly to both Adonis & Aphrodite.

Aphrodite holds our Community & Personal files & is backed up daily, monthly, &
yearly to Adonis.

We currently have one public Linux workstation, ``SewingMachine``, that runs
Debian & KDE - but the setup has been automated to make it easier to expand.

Servers
=======

.. _cerberus:

Cerberus
--------

Cerberus is our router that runs FreeBSD, serves ``.acorn`` DNS requests,
provides DHCP & WINS, & caches HTTP requests.

There's a guide available from the terminal, SSH into cerberus, then run
``cerberus_help`` for a long guide & ``cerberus_quick`` for a quick reference
of config files & useful commands.

TODO: Move that documentation over here! Configs, Services, Commands, CLI Guide

There are a couple of bandwidth graphs:

* Live Usage graph: http://cerberus.acorn:667
* Longer per-host graph: http://cerberus.acorn/bandwidth
* Live User per-host graph: run ``sudo iftop``

These links might be helpful:

* FreeBSD Handbook: http://www.freebsd.org/doc/en_US.ISO8859-1/books/handbook/
* PF Docs: http://www.openbsd.org/faq/pf/index.html
* Firewalling with PF: http://home.nuug.no/~peter/pf/en/index.html
* Newbie Guide for PF on OpenBSD: http://www.thedeepsky.com/howto/newbie_pf_guide.php
* TCP/IP Primer: http://www.ipprimer.com/

TODO: Buy a server w/ a lotta ram, ssd, & a 10Gb nic(for squid) and upgrade cerberus!


Aphrodite
---------

Aphrodite is a general-purpose Slackware server that runs the following services:

* **cups** - Print Server running at http://printers.acorn
* **http** - Apache webserver serving redmine to http://projects.acorn &
  minecraft to http://minecraft.acorn
* **samba** - Personal, Community, & Backup Windows Shares
* **minecraft** - Minecraft 1.7.2 Server at ``minecraft.acorn``
* **murmur** - Chat/VoIP server at ``chat.acorn``, port ``64738``.
* **moinmoin** - Wiki server running at http://wiki.acorn
* **AcornAccounting** - Custom accounting software running at http://accounting.acorn
* **zabbix** - Network/System Monitoring at http://monitor.acorn


Adonis
------

Adonis is our Slackware backup server, that hosts daily, monthly, & yearly
backups of the Business, Community, & Personal shares.


Buildings
=========

.. _seed-office:

Seed Office
-----------

The seed office is where our backbone switch lives & where the WAN line comes
in.

The office's ethernet jacks terminate in patch panels(labelled ``A`` & ``B``),
and are connected to 2 Quanta LB4Ms(``LB4M-1`` && ``LB4M-2``, :download:`manual
<_files/LB4M_manual.pdf>`). These LB4Ms connect to a Quanta
LB6M(``LB6M-1-PUBLIC``, :download:`manual <_files/LB6M_manual.pdf>`) which is
used as our public LAN's backbone.

``LB6M-1-PUBLIC`` also connects our public LAN to the VM Cluster. See the
:ref:`network-architecture` section for more information & the :ref:`Switch
Hardware <switch-hardware>` section for port layouts/assignments of the
switches.

There will eventually be a map of the Seed Office here showing what jack each
of the Public LAN ports hook up to.


Heartwood
---------

Heartwood is connected to the Seed Office via a pair of ENH202 wifi points. The
wifi line enters from the dining room & is switched to an AP and the switch in
the living room. The upstairs switch feeds to workstations, 2 other switches
that also feed to workstations, & 2 ENH202s(one for the BarnYard wifi, one for
the Trailer connection).

The closet office computer connects to the AP.


Farmhouse
---------

The Farmhouse is connected to the Seed Office via an ENH202 wifi point, which
goes to a switch that has an AP and runs to workstations.


Trailer
-------

The Trailer get's it internet access from Heartwood via an ENH202 wifi point.


.. _network-architecture:

Networking
==========

We have 6 networks:

==================      ==============
Network                 IP CIDR
==================      ==============
Public LAN              192.168.1.0/24
VM LAN                  10.0.1.0/24
Cluster Management      10.2.1.0/24
Cluster Overlay         10.3.1.0/24
Cluster Storage         10.4.1.0/24
Cluster Sync            10.5.1.0/24
==================      ==============

Hosted across 3 LB4M(:download:`manual <_files/LB4M_manual.pdf>`) & 2
LB6M(:download:`manual <_files/LB6M_manual.pdf>`) switches:

* :ref:`lb4m-1`
* :ref:`lb4m-2`
* :ref:`lb4m-3-mgmt`
* :ref:`lb6m-1-public`
* :ref:`lb6m-2-storage`

:ref:`cerberus` provides DHCP to the Public LAN & all addressing of cluster
nodes is done manually, using static IPs.

We use the following color-coding for ethernet cabling:

==========  ===================
**RED**     Phone Lines
**YELLOW**  Power over Ethernet
**BLACK**   WAN Line
**GREEN**   Router Link
**BLUE**    Public LAN
**ORANGE**  Cluster Management
**WHITE**   Cluster Overlay
**PURPLE**  Cluster Provider
**GREY**    Cluster Storage
==========  ===================

All the Fiber cables are 50/125 OM3, which are aqua colored. We use Juniper
Networks EX-SFP-10GE-SR fiber transceivers.

The Public LAN is what our workstations connect to. It is routed to the
internet and the Cluster Management network by :ref:`cerberus`. Only HTTP & SSH
connections to the Management's controller nodes are allowed. It is hosted by
:ref:`lb4m-1`, :ref:`lb4m-2`, & :ref:`lb6m-1-public`.

The VM LAN is a virtual network hosted by OpenStack, it's the network that all
running VMs connect to. OpenStack maps addresses on this network to a range of
addresses on the Public LAN when you assign a VM a Floating IP.

The Cluster Management network is used for cluster nodes to talk to each other
& the WAN(via :ref:`cerberus`). The Cluster Overlay network is used for
internal communication between VMs. These two networks reside on the same
hardware, :ref:`lb4m-3-mgmt`.

The Cluster Storage network provides nodes with access to the distributed
storage cluster. The Cluster Sync network is used for syncing the Storage
nodes. Both the Storage & Sync networks reside on :ref:`lb6m-2-storage`.

.. seealso::

    :ref:`cluster-hardware` for the interfaces & ip ranges each node type uses
    for each Network.

    :ref:`switch-hardware` for the Network allocation & port connections for
    each switch.


.. _vm-cluster:

VM Cluster
==========

Currently, we use 3 Controllers, 3 Computes, & 3 Storage nodes in a High
Availability configuration. Neutron is setup to support self-service networks.


High Availability
------------------

See the `High Availability Guide`_ for reference.

For setup directions, see the :ref:`ha-initialization` section and
the :ref:`cluster-expansion` section.

Storage nodes use Ceph for distributed & high availability image & block
storage. An odd number of 3 or more storage nodes is recommended.

Ceph administration is done with ``ceph`` and ``ceph-deploy`` on controller
nodes. Each controller node runs a monitoring daemon and each storage node runs
one storage daemon per drive.

Controller nodes are have various services setup in distributed & failover
configurations.  `Pacemaker`_ is used to share a virtual IP address that is
shared between all the Controller nodes. When a node goes down, another node
adopts the virtual IP.

OpenStack services & endpoints are distributed using `HAProxy`_. HAProxy
takes requests to the virtual IP address and distributes them across all
available controller nodes.

RabbitMQ, Memcached, & MySQL are all clustered as well. RabbitMQ & Memcached
use other nodes as failovers, while MySQL uses Galera for replication & HAProxy
for handling failovers.

TODO: Do memcached urls for openstack service auth & horizon need configuration?


.. warning::

    Compute nodes are not setup for high availability, there is currently no
    automated relaunching of VMs on failed Compute nodes.


Node Services
--------------

TODO: Split into sections & describe what each service is for.

The controller nodes run the following services:

* ceph-mon
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

* ceph-osd

TODO: Update for our new DVR Open vSwitch configuration


Network Addressing
------------------

IP addressing of nodes is done manually in ``/etc/network/interfaces``.

.. seealso::

    :ref:`cluster-hardware` for the specific interface to network mappings of
    each node.

    :ref:`network-architecture` for information on each Network.

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



.. _High Availability Guide:        https://docs.openstack.org/ha-guide/
.. _Pacemaker:                      http://clusterlabs.org/pacemaker.html
.. _HAProxy:                        http://www.haproxy.com
