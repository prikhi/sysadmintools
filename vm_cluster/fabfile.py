from fabric.api import sudo, env
from fabric.colors import red
from fabric.contrib.console import confirm
from fabric.contrib.files import exists
from fabric.operations import reboot

env.hosts = [
    'stack@stack-controller-1.acorn',
    'stack@stack-controller-2.acorn',
    'stack@stack-controller-3.acorn',
    'stack@stack-compute-1.acorn',
    'stack@stack-compute-2.acorn',
    'stack@stack-compute-3.acorn',
    'stack@stack-storage-1.acorn',
    'stack@stack-storage-2.acorn',
    'stack@stack-storage-3.acorn',
]


def upgrade():
    sudo('apt-get update -qq && apt-get upgrade -yqq')
    if exists('/var/run/reboot-required') and confirm('Needs reboot, do it now?'):
        print(red('Rebooting now', True))
        reboot()
