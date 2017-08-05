==========================
Acorn VM Cluster Hardware
==========================

Acorn runs a 9-node cluster with 3 controller, 3 compute, & 3 storage nodes.


Console Hardware
================

We use a Dell PowerEdge 2160AS 16-Port KVM Console Switch w/ a PowerEdge 15FP
Console KMM.

We have a combination of USB & PS/2 KVM Ethernet Cables, the Controllers use
USB cables while the Compute & Storage nodes use PS/2.

TODO: Double check ^that's true


Network Hardware
=================

We have 4 networks:

* User LAN @ 192.168.1.0/24
* VM Management @ 10.2.1.0/24
* VM Overlay @ 10.3.1.0/24
* VM Storage @ 10.4.1.0/24
* VM Sync @ 10.5.1.0/24

IP addressing of cluster nodes is done manually, using static IPs.

We use the following color-coding for ethernet cabling:

* RED - Phone Lines
* YELLOW - Power over Ethernet
* BLACK - WAN Line
* ORANGE - VM Management
* WHITE - VM Overlay
* PURPLE - VM Provider
* GREY - VM Storage

All the Fiber cables are 50/125 OM3, which are aqua colored. We use Juniper
Networks EX-SFP-10GE-SR fiber transceivers.

The office ethernet ports terminate in patch panels(labelled ``A`` & ``B``),
and are connected to 2 Quanta LB4Ms(``LB4M-1`` && ``LB4M-2``). These LB4Ms
connect to a Quanta LB6M(``LB6M-1-PUBLIC``) used as our public LAN's backbone.

``LB6M-1-PUBLIC`` also connects the managment & overlay switch(``LB4M-3-MGMT``)
to provide nodes internet access.

There is an internal LB6M(``LB6M-2-STORAGE``) connected to the controllers,
computes & storage nodes. This is used for internal data transfer & syncing, it
is not exposed to the User LAN.

The User LAN is our public address space, it is routed to the WAN & to the VM
Mangagement network.

The VM Mangaement network is used for cluster nodes to talk to each other & the
WAN. The VM Overlay network is used for internal communication between VMs.
They reside on the same hardware, ``LB4M-3-MGMT``.

The VM Storage network is used for communication between the Storage nodes &
the Compute & Controller nodes. The VM Sync network is used for syncing the
Storage nodes. The Storage & Sync networks reside ``LB6M-2-STORAGE``.



Controller Nodes
=================

====================  ========================================================
**CPU**               Intel Xeon L5640 6-Core 2.2GHz
**Chassis**           1U Supermicro XC815TQ-560B
**HDD**               250GB OS
**Motherboard**       Supermicro X8DTU-F
**NIC**               2x1GB Onboard & 2x1GB via Supermicro AOC-PG-12+
**PSU**               1x560w
**RAID Controller**   LSI 9211-4i
**RAM**               32GB
====================  ========================================================

The OS drive is in the leftmost bay.

NICs
-----

===================     =========   ============    ============
rear panel location     interface   network         ip range
===================     =========   ============    ============
bottom-left             enp1s0f0    management      10.2.1.11-40
bottom-right            enp1s0f1    overlay         10.3.1.11-40
top-left                enp3s0f0    provider        n/a
top-right               enp3s0f1    storage         10.4.1.11-40
===================     =========   ============    ============



Compute Nodes
==============

====================  ========================================================
**CPU**               2x AMD Opteron 6172 12-Core 2.1GHz
**Chassis**           1U HP Proliant DL165 D7
**HDD**               1TB OS
**NIC**               4x1GB Onboard & 2x10GB via HP NC522SFP PCI-E
**RAM**               48GB
====================  ========================================================

The OS drive is in the leftmost bay.

NICs
-----

TODO: Check ethernet numbering & networks match up to plan(4=top?,3=bottom?)

=====================   =========   ==========      ============
rear panel location     interface   network         ip range
=====================   =========   ==========      ============
ethernet "4" - top      enp3s0f1    management      10.2.1.41-70
ethernet "3" - bottom   enp3s0f0    overlay         10.3.1.41-70
ethernet "2" - left     enp4s0f1    not used
ethernet "1" - right    enp4s0f0    not used
fiber left              ens1f0      provider        n/a
fiber right             ens1f1      storage         10.4.1.41-70
=====================   =========   ==========      ============

Eventually, we might use the spare 2x 1GB NICs as failovers for the fiber
links.



Storage Nodes
==============

6x3TB per node gives us a safe size of 12TB & risky size of 18TB, with the
ability to add 5 more drives per node, or 4 drives & a journal drive.

http://florian.ca/ceph-calculator/

====================  ========================================================
**CPU**               2x Intel Xeon E5645 6-Core 2.4Ghz
**Chassis**           2U Supermicro CSE-826TQ-R800LPB SuperChasis
**HDD**               250GB OS, 6x3TB SAS Storage
**Motherboard**       Supermicro X8DTN+
**NIC**               2x1GB Onboard & 2x10GB via Supermicro AOC-STGN-i2S
**PSU**               2x800w
**RAID Controller**   8-Ports via Adaptec ASR-5805, 4-Ports via ASR-5405Z
**RAM**               48GB
====================  ========================================================

NICs
-----

===================     =========   ==========      =============
rear panel location     interface   network         ip range
===================     =========   ==========      =============
ethernet left           enp10s0f0   management      10.2.1.71-100
ethernet right          enp10s0f1   not used
fiber top               enp3s0f0    storage         10.4.1.71-100
fiber bottom            enp3s0f1    sync            10.5.1.71-100
===================     =========   ==========      =============

Eventually, we might use the spare 1GB NIC as a failover for a fiber link.

HDDs
-----

This is the order the OS sees the drives as being in. It's kind of strange,
hopefully an additional RAID card will allow it to be numbered sequentially.

==========  ====    ==  ==  =====
_           left            right
==========  ====    ==  ==  =====
**top**     11      02  05  08
**middle**  10      01  04  07
**bottom**  09      12  03  06
==========  ====    ==  ==  =====

The OS drive lives in bay ``9``, the 6x HDDs live in bays ``4`` to ``8``.
