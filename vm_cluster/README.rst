=================
Acorn VM Cluster
=================

The ``vm_cluster`` folder contains files relevant to administration of Acorn's
VM cluster, which runs on OpenStack with Ubuntu nodes.

Automated Installs
===================

The initial OS install is automated using a `Ubuntu pre-seed file`_. This will
install a basic Ubuntu SSH server. The rest of the configuration is automated
using an `Ansible`_ playbook.

Ubuntu Pre-Seed File
---------------------

The ``devstack-preseed.cfg`` file is a preseed file for the `Ubuntu Automated
Installer`_. It sets up an ssh server, a ``stack`` user, and installs
``python``, ``git`` & ``vim``.

Start by booting up a `Ubuntu Mini Image`_, when the menu appers, press
``<TAB>`` and add the following: ``auto=true priority=critical
interface=<desired_interface> hostname=<desired_hostname> url=<preseed_url>``.
The ``interface=`` is only required if you have multiple network interfaces.
If you don't know which interface it is, leave it out to enable the selection
menu, then press ``<CTRL>-<ALT>-<F2>`` to get a shell and investigate which is
plugged in, or just plug every network port in and specify ``interface=auto``.
For example::

    auto=true priority=critical interface=ens4p0f0 hostname=openstack-aio url=http://lucy.acorn/~prikhi/devstack-preseed.cfg

You will face issues if the installation media is on a USB stick and the
installer sees it as ``/dev/sda``. Grub will try to install to the MBR of
``/dev/sda`` and fail. To fix this, open a shell and run ``grub-installer
/target``, then choose to install grub to the proper drive(probably
``/dev/sdb``).

Ansible Playbook
-----------------

The Ansible playbook is a series of tasks(grouped into roles) that ensure
OpenStack is installed & properly configured. The playbook currently has roles
for ``controller`` and ``compute`` nodes.

The ``cluster-servers`` file specifies the address, name and node type of each
of our OpenStack servers. Currently there is only a single controller & a
single compute node, which are guests on a DevStack hypervisor.

You can run the playbook by installing ansible with pip and using the
``ansible-playbook`` command inside the ``playbook`` directory::

    sudo pip install ansible
    cd playbook
    ansible-playbook acorn.yml

Automated Maintenance
======================

There is a `Fabric`_ file that can be used to automatically update and upgrade
the cluster servers::

    fab upgrade


.. _Ubuntu pre-seed file:           https://help.ubuntu.com/lts/installation-guide/armhf/apbs03.html
.. _Ansible:                        https://www.ansible.com/
.. _Ubuntu Automated Installer:     https://help.ubuntu.com/lts/installation-guide/armhf/apb.html
.. _Ubuntu Mini Image:              http://www.ubuntu.com/download/alternative-downloads
.. _Fabric:                         http://www.fabfile.org/
