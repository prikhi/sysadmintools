===================================
Debian Workstation Automated Setup
===================================

This folder contains files used for automated installation, configuration and
maintenance of Acorn's Linux Workstations, which run Debian Linux.

This playbook may be run after a minimal install is completed. It will do the
following actions:

* Install Standard Applications (KDE, Firefox, LibreOffic)
* Configure for use with Acorn's network (wins server, ntp, zabbix)
* Create sese & admin users along with users for specific cos
* Apply a standardized configuration to the sese & admin users
* Apply personalized configurations to personal accounts
* Configure basic applications like Firefox and Chrome

The ``preseed.txt`` file is configuration file that can be used with the
`Debian Automated Installer`_.

.. _Debian Automated Installer: https://www.debian.org/releases/stable/i386/apb.html
