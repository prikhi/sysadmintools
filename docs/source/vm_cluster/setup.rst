=====================
Setup & Configuration
=====================


The initial OS install is automated using a `Ubuntu pre-seed file`_. This will
install a basic Ubuntu SSH server onto a node.

Then some manual setup is required to setup ``sudo`` access & the network
interfaces.

The OpenStack configuration is automated using an `Ansible`_ playbook.

Our High Availability services require some manual setup when first
initializing the cluster and when adding new nodes to a running cluster(see
:ref:`cluster-initialization` & :ref:`cluster-expansion`).


.. _node-setup:

Node Setup
===========

Ubuntu Pre-Seed File
---------------------

The ``devstack-preseed.cfg`` file is a pre-seed file for the `Ubuntu Automated
Installer`_. It sets up an ssh server, a ``stack`` user, and installs
``python``, ``git``, ``htop``, & ``vim``.

Start by booting up a `Ubuntu Mini Image`_, when the menu appears, press
``<TAB>`` and add the following::

    auto=true priority=critical interface=<management_interface> hostname=<desired_hostname> url=<preseed_url>

.. seealso::

    If you don't know which interface on a node connects to the management
    network, reference the :ref:`cluster-hardware` section.

.. note::

    If you are using different hardware, leave out the ``interface`` option to
    enable the selection menu, then press ``<CTRL>-<ALT>-<F2>`` to get a shell and
    investigate which is plugged in, or just plug every network port in and specify
    ``interface=auto``.

For example::

    auto=true priority=critical interface=enp1s0f0 hostname=stack-controller-1.acorn url=http://lucy.acorn/devstack-preseed.cfg

You will face issues if the installation media is on a USB stick and the
installer sees it as ``/dev/sda``. Grub will try to install to the MBR of
``/dev/sda`` and fail. To fix this, open a shell and run ``grub-installer
/target``, then choose to install grub to the proper drive(probably
``/dev/sdb``).


Sudo Setup
-----------

The nodes should be setup to use ``sudo`` without a password::

    visudo
    # Add the following line:
    # %sudo ALL=(ALL) NOPASSWD: ALL


Network Setup
--------------

The network connections & IP addresses must be setup by manually. Refer to the
:ref:`cluster-hardware` section for the interface & IP range to use for each
node & network type. Configure the networks by editing
``/etc/network/interfaces``::

    # TODO: Remove this for final install since public routed through mgmt
    # The primary public interface
    auto enp0s3
    iface enp0s3 inet dhcp

    # The Management Network Interface
    auto enp0s8
    iface enp0s8 inet static
        address 10.2.1.11
        netmask 255.255.255.0

On controller & compute nodes, add the Provider & Overlay Network Interfaces::

    # The Provider Network Interface
    auto enp0s9
    iface enp0s9 inet manual
    up ip link set $IFACE up
    down ip link set $IFACE down

    # The Overlay Network Interface
    auto enp0s10
    iface enp0s10 inet static
        address 10.3.1.11
        netmask 255.255.255.0

On controller, compute, & storage nodes, add the Storage Network Interface::

    # The Storage Network Interface
    auto enp0s11
    iface enp0s11 inet static
        address 10.4.1.11
        netmask 255.255.255.0

On storage nodes, add the Storage Sync Network::

    # The Storage Sync Network Interface
    auto enp0s12
    iface enp0s12 inet static
        address 10.5.1.71
        netmask 255.255.255.0

Then restart the networking service::

    sudo systemctl restart networking


Ansible Playbook
=================

The Ansible playbook is a series of tasks(grouped into roles) that ensure
OpenStack is installed & properly configured. The playbook currently has a
``common`` role for all nodes, as well as specific roles for ``controller`` and
``compute`` nodes.

The ``cluster-servers`` file specifies the address, name and node type of each
of our OpenStack servers. Currently there are three controller nodes, three
compute nodes, & three storage nodes.

You can run the playbook by installing ansible with pip and using the
``ansible-playbook`` command inside the ``playbook`` directory::

    sudo pip install ansible
    cd playbook
    ansible-playbook acorn.yml


.. _Ubuntu pre-seed file:           https://help.ubuntu.com/lts/installation-guide/armhf/apbs03.html
.. _Ansible:                        https://www.ansible.com/
.. _Ubuntu Automated Installer:     https://help.ubuntu.com/lts/installation-guide/armhf/apb.html
.. _Ubuntu Mini Image:              http://www.ubuntu.com/download/alternative-downloads
