"""
This Fabric file contains commands for Administrating Acorn's Servers.

It is assumed we are currently running Slackware Linux.

Usage:

    List available commands with ``fab -f fab_slack.py -l``
    Run commands with ``fab -f fab_slack.py command:args,kwarg=value``

"""
from fabric.api import prompt, sudo, env
from fabric.context_managers import settings


env.hosts = ['aphrodite.acorn', 'vishnu.acorn', 'adonis.acorn']


def update_package_list():
    """Update the list of packages from the current repository."""
    sudo("/usr/sbin/slackpkg update -batch=on")


def install_package(package_name=None):
    """Install the specified package."""
    if package_name is None:
        package_name = prompt("Which package?")
    update_package_list()
    sudo("/usr/sbin/slackpkg install {}".format(package_name))


def upgrade_package(package_name=None):
    """Upgrade the specified package."""
    if package_name is None:
        package_name = prompt("Which package?")
    update_package_list()
    sudo("/usr/sbin/slackpkg upgrade {}".format(package_name))


def remove_package(package_name=None):
    """Remove the specified package."""
    if package_name is None:
        package_name = prompt("Which package?")
    sudo("/usr/sbin/slackpkg remove {}".format(package_name))


def upgrade_all_packages():
    """Upgrade all packages to the latest version."""
    sudo("/usr/sbin/slackpkg upgrade-all -batch=on")


def update_and_upgrade():
    """Update the package list and Upgrade all packages."""
    update_package_list()
    upgrade_all_packages()


def update_pavans_dotfiles():
    """Update Pavan's User Configuration."""
    with settings(sudo_user='prikhi'):
        sudo("cd /home/prikhi/.dotfiles; git pull; ./install.sh")
