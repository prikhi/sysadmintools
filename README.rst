----------------------------------
Acorn System Administration Tools
----------------------------------

This repository contains files/scripts for the automated administration of
Acorn's Linux servers & workstations.

The main applications used are `Ansible`_ and `Fabric`_.


Fabric Slackware Administration
---------------------------------

`Fabric`_ is used to automate package installation and upgrades on Acorn's
Slackware servers.

Install Fabric using ``pip``:

    pip install fabric

List possible commands:

    fab -f fabric/slackware.py -l

Update all packages on all hosts:

    fab -f fabric/slackware.py upgrade_all_packages


.. _Ansible: http://www.ansible.com/home
.. _Fabric:  http://www.fabfile.org/
