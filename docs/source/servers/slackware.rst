===============================
Slackware Server Administration
===============================

`Fabric`_ is used to automate package installation and upgrades on Acorn's
Slackware servers. The ``slackware_servers`` module includes a ``fabfile.py``
that defines the possible commands.

Install Fabric using ``pip``::

    pip install fabric

List possible commands::

    cd slackware_servers
    fab -l

Update all packages on all hosts::

    cd slackware_servers
    fab upgrade_all_packages


.. _Fabric:  http://www.fabfile.org/
