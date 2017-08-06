=====================
Acorn IT Architecture
=====================


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


Cerberus
========

Cerberus is our router that runs FreeBSD, serves ``.acorn`` DNS requests,
provides DHCP & WINS, & caches HTTP requests.

There's a guide available from the terminal, SSH into cerberus, then run
``cerberus_help`` for a long guide & ``cerberus_quick`` for a quick reference
of config files & useful commands.

TODO: Move that documentation over here!

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

TODO: Add maintenance documentation: adding static ips, killing someones internet

TODO: Buy a server w/ a lotta ram, ssd, & a 10Gb nic and replace cerberus


Aphrodite
=========

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
======

Adonis is our Slackware backup server, that hosts daily, monthly, & yearly
backups of the Business, Community, & Personal shares.
