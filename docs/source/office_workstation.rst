===================================
Debian Workstation Automated Setup
===================================

The ``office_workstation`` folder contains files used for automated
installation, configuration and maintenance of Acorn's Linux Workstations,
which run `Debian Linux`_.


Quickstart
===========

#. Download the `Debian Stretch Netinstall Image`_.
#. Copy the ISO to a USB Stick::

    dd if=debian-stretch.iso of=/dev/sdg

#. Boot the new workstation from the USB stick. When the installer menu pops
   up, hit escape and enter the following::

    auto hostname=NewWorkstation url=http://lucy.acorn/workstation-preseed.cfg

#. After installation is complete, jump to your workstation and install
   ansible::

    pip install ansible

#. Add the new workstation to the ``workstations`` file::

    echo 'NewWorkstation.acorn' >> playbook/workstations

#. Copy your SSH key over to the new workstation::

    ssh-copy-id seseadmin@NewWorkstation.acorn

#. Run the playbook::

    cd playbook; ansible-playbook acorn.yml

#. Make some coffee...

#. Once the playbook finishes, you should be logged in as the Public User and
   Mumble should have popped up.

#. Go through Mumble's Audio Wizard, complete the Certificate Wizard.  To get
   our Mumble server to show up in the favorites, you will have to rerun the
   playbook with the ``mumble`` tag::

    ansible-playbook acorn.yml -t mumble

#. Right-click the Desktop & hit ``Unlock Widget``, then ``Configure Desktop``.
   Change the ``Wallpaper`` tab's ``Layout`` option to ``Folder View``.

#. You might need to do some our layout tweaks, like rearranging the Desktop
   Icons, or increasing the height of the Task Bar(``Right-Click Task Bar ->
   Panel Options -> Panel Settings``). Afterards, right-click the Desktop again
   and choose ``Lock Widgets``.

#. Open PlayOnLinux and hit ``Run a Local Script``. Choose the
   ``PlayOnLinux_msoffice.sh`` file in the Home directory.

#. Cleanup by removing the MS Office ISO and the PlayOnLinux script and
   shortcut from the Public User's home folder.

#. Reboot the workstation.


Automated Installs
===================

The ``preseed.cfg`` file is configuration file that can be used with the
`Debian Automated Installer`_. It is based off of
the Automated Install documentation and the `example pre-seed`_ file .

Simply boot up using a `netinstall`_ image. When the graphical menu appears,
press ``<ESC>`` and enter ``auto hostname=<workstation_hostname>
url=<preseed_url>``. For example, if you wanted the new workstation to be named
``HelloWorld`` and your preseed was hosted at
http://lucy.acorn/~prikhi/preseed.cfg, you would type::

    auto hostname=NewWorkstation url=http://lucy.acorn/workstation-preseed.cfg

This will automatically partition the drives and setup an SSH server along with
an ``seseadmin`` admin user.

The `Ansible`_ playbook may then be used for further configuration.

.. note::

    You can use the `mkpasswd` command to generate crypted passwords for the
    pre-seed file::

        printf "someSecurePassword" | mkpasswd -s -m sha-512


Ansible Setup
==============

While the `Debian Automated Install`_ gets a minimal system up and running with
just an SSH server, the Ansible playbook adds the GUI(`KDE`_), desktop
applications, and Acorn specific customizations. It will do the following
actions:

* Install basic system utilities and the desktop environment(`KDE`_)
* Install standard applications (LibreOffice, Firefox, Chromium, Flash)
* Configure for use with network services (samba, zabbix, cups)
* Create a public user
* Apply a standardized configuration to the public user (bookmarks, shortcuts)
* Prepare the workstation and public user for installing MS Office
* Create personal user accounts and apply specific configurations to them

Start by using ``pip`` to install `Ansible`_::

    pip install ansible

You can then run the entire playbook using ``ansible-playbook``::

    cd office_workstation/playbook
    ansible-playbook acorn.yml

New hosts may be added to the ``workstations`` file. Plays will only be run if
the host requires it.

You may run specific ``tags`` using the ``-t`` flag. The following command will
only install and configure the Zabbix agent on hosts that do not have the agent
installed or are improperly configured::

    ansible-playbook acorn.yml -t zabbix

The following ``tags`` are available:

* ``kde`` - Install/Remove/Configure KDE packages.
* ``apps`` - Install/Remove available applications.
* ``zabbix`` - Install and configure the Zabbix agent.
* ``samba`` - Configure Samba and mount network shares on boot.
* ``cups`` - Install and configure the CUPS client(for printing).
* ``users`` - Create and configure accounts for all users.
* ``public_user`` - Create and configure a Public user account.
* ``pavan`` - Create and configure Pavan's user.

Playbook Overview
------------------

The playbook will first copy over the apt sources file. This ensures all
workstations use a common mirror which allows caching via web proxy(we use
`squid`_). Then the new mirrors available packages are updated.

Next various applications are installed such as the desktop environment, web
browsers, games, and educational applications. KDE applications are explicitly
installed(instead of being implicity linked to the ``kde-desktop`` task).

The `Zabbix`_ agent is then installed and configured. We rely on Zabbix's
auto-discovery features, monitoring only system resource usage.

Next we set up printing by installing and configuring the `CUPS`_ client, using
a central print server instead of configuring printers on each machine.

A Public User is then created and application and DE customizations are copied
over to it's home directory. Any additional users for specific people are then
created and customized.

Samba is then setup to use a common workgroup and WINS server. Personal and
Community samba shares are set to be automatically mounted on boot.

We then prepare the Public User's home directory for installing Microsoft
Office 2007 using `PlayOnLinux`_. This will mount the install ISO, copy over
patch files and create a PlayOnLinux script in the Public User's home
directory. The script must still be run manually.

Finally, we configure SDDM, the Display/Login Manager, to automatically login
as the Public User.

Microsoft Office 2007
----------------------

PlayOnLinux requires a GUI to install programs, so this playbook only prepares
a workstation for the installation, the actual installation must be done by
hand. The installation can be run by opening up PlayOnLinux, selecting ``Tools
-> Run a Local Script``, then choosing to run the ``PlayOnLinux_msoffice.sh``
script found in the Public User's home directory.

A network share containing the following files is required:

* An ISO of the Microsoft Office 2007 install disk
* The bin, lib and share folders for Wine 1.2.3(manually install Wine 1.2.3
  using PlayOnLinux to get a copy of these)
* The `wine-gecko`_ install file
* The `XP SP3`_ patch file

The Playbook will copy these files to the proper directories & mount the ISO.

Customization
--------------

The playbook can be modified for other networks by creating a replacement for
the ``acorn.yml`` file. You can override any variables found in the
``roles/common/vars/main.yml`` file. This will allow you to customize various
specifics like the CUPS or WINS servers and the name of the Public user
account.

Variables can also be set in the ``workstations`` file. See the `Ansible
Documentation <ansible-var-docs>`_ for more information.

Contributing
-------------

You should make sure any new features are properly abstracted from your
specific implementation through the use of templates and variables.

The main issue tracker lives at http://bugs.sleepanarchy.com/projects/sysadmin,
feel free to create a new issue(attach a patch file if you have one). Pull
requests are also accepted from our github mirror at
https://github.com/prikhi/sysadmintools.



Automated Maintenance with Fabric
==================================

A ``fabfile.py`` for `Fabric`_ is also included to help automate workstation
maintenance. Currently it may be used to automatically install and upgrade
packages.

First make sure you have `Fabric`_ installed::

    pip install Fabric

To get a full list of commands, run ``fab` with the ``-l`` flag::

   cd office_workstation
   fab -l

To upgrade all packages, use the ``update_and_upgrade`` command::

    fab update_and_upgrade

To upgrade all packages **and** install any new dependencies, use
``full_upgrade``::

    fab full_upgrade


To Do
======

* Abstract KDE specificities into a separate role
* Change some of the Public User's config files into templates or tasks,
  especially ones that have the ``sese`` user hardcoded in them.
* Add a role that uses a lightweight DE along with customizations for the
  Public User(for low-power comps or laptops).
* Refactor the "iommu=pt" grub option needed for SewingMachine into a
  ``host_var`` file.
* Address deprecation warnings.
* Update public user files for debian 9 & new KDE.
* Use Ansible Vault for password hashes.
* Pre-configure mumble so the audio wizard isn't required.
* Configure udevil to allow cifs mounting

.. _Debian Stretch Netinstall Image: https://www.debian.org/CD/netinst/
.. _Debian Linux:                   https://www.debian.org/
.. _Debian Automated Installer:
.. _Debian Automated Install:       https://www.debian.org/releases/stable/i386/apb.html
.. _example pre-seed:               https://www.debian.org/releases/etch/example-preseed.txt
.. _netinstall:                     https://www.debian.org/CD/netinst/
.. _Ansible:                        http://www.ansible.com/home
.. _wine-gecko:                     https://lion-winebuilder.googlecode.com/files/wine_gecko-1.0.0-x86.cab
.. _XP SP3:                         http://www.microsoft.com/en-us/download/details.aspx?id=24
.. _ansible-var-docs:               http://docs.ansible.com/playbooks_variables.html
.. _KDE:                            https://wiki.debian.org/KDE
.. _squid:                          http://www.squid-cache.org/
.. _Zabbix:                         http://www.zabbix.com/
.. _CUPS:                           https://www.cups.org/
.. _PlayOnLinux:                    http://www.playonlinux.com/
.. _Fabric:                         http://www.fabfile.org/
