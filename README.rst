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


.. include:: slackware_servers/README.rst

.. include:: office_workstation/README.rst
