----------------------------------
Acorn System Administration Tools
----------------------------------

.. image:: https://readthedocs.org/projects/acorn-networking/badge/?version=latest
    :target: http://acorn-networking.readthedocs.io/en/latest/?badge=latest
    :alt: Documentation Status

This repository contains files/scripts for the automated administration of
Acorn's Linux servers(Slackware) & workstations(Debian).

You can read all the associated documentation at
http://acorn-networking.rtfd.org.

The main applications we use are `Ansible`_ and `Fabric`_.

The ``Ansible`` and ``Fabric`` dependencies may be installed via ``pip``::

    pip install ansible Fabric

You can build the documentation yourself by using `Sphinx`_, also installed via
``pip``::

    # Create & Source A Python Virtual Environment
    python -m venv Env
    source Env/bin/activate
    pip install -r requirements.txt
    cd docs
    make html
    firefox build/html/index.html

You can run just ``make`` to see all the formats you can build. You might want
``make latexpdf`` to generate a PDF of the documentation.

TODO: Add playbooks for VM servers
TODO: Move documentation to Sphinx & RTFD.org


.. include:: slackware_servers/README.rst

.. include:: office_workstation/README.rst

.. include:: vm_cluster/README.rst


.. _Ansible: http://www.ansible.com/home
.. _Fabric:  http://www.fabfile.org/
.. _Sphinx:  http://www.sphinx-doc.org/
