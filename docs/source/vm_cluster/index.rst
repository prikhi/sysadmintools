=================
Acorn VM Cluster
=================

Acorn's VM cluster runs `OpenStack Newton`_ on `Ubuntu Server`_ 16.04 LTS nodes.

TODO: Update OpenStack to Ocata

TODO: Setup & test routing between mgmt network, user lan, & wan

TODO: Use apcupsd to shutdown VMs & nodes on power loss.

TODO: Fix service/endpoint tasks to decouple service & endpoint creation.

TODO: Update host_vars for production setup, or add separate for vbox

TODO: Document required variables by each role/group

TODO: Investigate Cinder Backup

.. toctree::
    :maxdepth: 2
    :titlesonly:

    architecture
    setup
    maintenance
    initialization
    trials


.. _OpenStack Newton:               https://docs.openstack.org/newton/
.. _Ubuntu Server:                  https://www.ubuntu.com/server
