----------------------------------
Acorn System Administration Tools
----------------------------------

This repository contains files/scripts for the automated administration of
Acorn's Linux servers(Slackware) & workstations(Debian).

The main applications used are `Ansible`_ and `Fabric`_.

You can build this documentation by using `Sphinx`_, installed via ``pip``::

    # Create & Source A Python Virtual Environment
    python -m venv Env
    source Env/bin/activate
    pip install -r requirements.txt
    cd docs
    make html
    firefox build/html/index.html

Eventually the documentation will be automatically built & hosted on rtfd.org.

The ``Ansible`` and ``Fabric`` dependencies may also be installed via ``pip``::

    pip install ansible Fabric

TODO: Add playbooks for VM servers
TODO: Move documentation to Sphinx & RTFD.org


.. include:: slackware_servers/README.rst

.. include:: office_workstation/README.rst

.. include:: vm_cluster/README.rst


.. _Ansible: http://www.ansible.com/home
.. _Fabric:  http://www.fabfile.org/
.. _Sphinx:  http://www.sphinx-doc.org/
