----------------------------------
Acorn System Administration Tools
----------------------------------

This repository contains files/scripts for the automated administration of
Acorn's Linux servers(Slackware) & workstations(Debian).

The main applications used are `Ansible`_ and `Fabric`_.

You can build this documentation by using python's ``docutils`` module,
installed via ``pip``::

    pip install docutils
    rst2html.py README.rst > index.html
    firefox index.html

The ``Ansible`` and ``Fabric`` dependencies may also be installed via ``pip``::

    pip install ansible Fabric

TODO: Add playbooks for VM servers
TODO: Move documentation to Sphinx & RTFD.org


.. include:: slackware_servers/README.rst

.. include:: office_workstation/README.rst

.. include:: vm_cluster/README.rst


.. _Ansible: http://www.ansible.com/home
.. _Fabric:  http://www.fabfile.org/
