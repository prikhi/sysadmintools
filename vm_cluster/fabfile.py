from fabric.api import sudo, env
from fabric.colors import red
from fabric.contrib.console import confirm
from fabric.contrib.files import exists
from fabric.operations import reboot

env.hosts = [
    'stack@192.168.1.190',
    'stack@192.168.1.194',
    'stack@192.168.1.195',
    'stack@192.168.1.197',
    'stack@192.168.1.198',
    'stack@192.168.1.199',
]


def upgrade():
    sudo('apt-get update -qq && apt-get upgrade -yqq')
    if exists('/var/run/reboot-required') and confirm('Needs reboot, do it now?'):
        print(red('Rebooting now', True))
        reboot()
