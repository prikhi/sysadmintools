====================
Cluster Architecture
====================


Currently, we use 3 Controllers, 3 Computes, & 3 Storage nodes in a High
Availability configuration. Neutron is setup to support self-service networks.

High Availability
==================

See the `High Availability Guide`_ for reference.

For setup directions, see the :ref:`ha-initialization` section and
the :ref:`cluster-expansion` section.

Storage nodes use Ceph for distributed & high availability image & block
storage. An odd number of 3 or more storage nodes is recommended.
Ceph administration is done with ``ceph`` and ``ceph-deploy`` on controller
nodes. Each controller node runs a monitor daemon and each storage node runs
one OSD daemon per storage disk.

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


.. warning::

    Compute nodes are not setup for high availability, there is currently no
    automated relaunching of VMs on failed Compute nodes.


Node Services
==============

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


Network Setup
==============

Our public address space is on ``192.168.1.0/24`` while the overlay network is
on ``10.4.1.0/24``, the internal management network is on ``10.5.1.0/24``, and
the storage network is on ``10.6.1.0/24``. IP addressing of nodes is done
manually in ``/etc/network/interfaces/``.

For the specific interface to network mappings, see the sections on the
:ref:`cluster-hardware` page.

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



.. _High Availability Guide:        https://docs.openstack.org/ha-guide/
