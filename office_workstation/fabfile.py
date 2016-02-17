"""
This Fabric file contains commands for Administrating Acorn's Workstations.

It is assumed we are currently running Debian GNU/Linux.

Usage:

    List available commands with ``fab -l``
    Run commands with ``fab command:args,kwarg=value``

"""
from fabric.api import prompt, sudo, env


env.hosts = ['SewingMachine']


def update_package_list():
    """Update the list of packages from the current repository."""
    sudo("apt-get update -y")


def install_package(package_name=None):
    """Install the specified package."""
    if package_name is None:
        package_name = prompt("Which package?")
    update_package_list()
    sudo("apt-get install {}".format(package_name))


def upgrade_package(package_name=None):
    """Upgrade the specified package."""
    install_package(package_name)


def remove_package(package_name=None, purge=False):
    """Remove the specified package."""
    if package_name is None:
        package_name = prompt("Which package?")
    if purge:
        sudo("apt-get purge {}".format(package_name))
    else:
        sudo("apt-get remove {}".format(package_name))


def upgrade_all_packages():
    """Upgrade all packages to the latest version."""
    sudo("apt-get upgrade -y")


def update_and_upgrade():
    """Update the package list and Upgrade all packages."""
    update_package_list()
    upgrade_all_packages()


def full_upgrade():
    """Upgrade all packages, including new dependencies."""
    update_package_list()
    sudo("apt-get dist-upgrade -y")
