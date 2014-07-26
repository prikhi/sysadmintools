===================================
Debian Workstation Automated Setup
===================================

The ``office_workstation`` module contains files used for automated
installation, configuration and maintenance of Acorn's Linux Workstations,
which run `Debian Linux`_.

Automated Installs
-------------------

The ``preseed.cfg`` file is configuration file that can be used with the
`Debian Automated Installer`_. It is based off of
the Automated Install documentation and the `example pre-seed`_ file .

Simply boot up using a `netinstall`_ image. When the graphical menu appears,
press ``<ESC>`` and enter ``auto url=http://lucy.acorn/~prikhi/preseed.cfg``.

This will automatically partition the drives and install KDE along with an
``seseadmin`` user.

The `Ansible`_ playbook may then be used for furthur configuration.

Ansible Setup
--------------

The `Debian Automated Install`_ gets an entire system up and running with
`KDE`_, the Ansible playbook adds Acorn specific customizations. It will do the
following actions:

* Install Standard Applications (Firefox, Flash)
* Configure for use with Acorn's network (samba, zabbix)
* Create an sese user along with users for specific cos
* Apply a standardized configuration to the sese & seseadmin users
* Apply personalized configurations to personal accounts
* Configure basic applications like Firefox and Chrome

**TODO**

Actually write the playbook....


.. _Debian Linux:               https://www.debian.org/
.. _Debian Automated Installer:
.. _Debian Automated Install:   https://www.debian.org/releases/stable/i386/apb.html
.. _example pre-seed:           https://www.debian.org/releases/etch/example-preseed.txt
.. _netinstall:                 https://www.debian.org/CD/netinst/
.. _Ansible:                    http://www.ansible.com/home
.. _KDE:                        https://wiki.debian.org/KDE
