from fabric.api import sudo, env
from fabric.colors import red
from fabric.contrib.console import confirm
from fabric.contrib.files import exists
from fabric.operations import reboot

env.hosts = [
    'ubuntu@192.168.1.5',
    'ubuntu@192.168.1.6',
]

def upgrade():
    sudo('apt-get update -qq && apt-get upgrade -yqq')
    if exists('/var/run/reboot-required') and confirm('Needs reboot, do it now?'):
        print(red('Rebooting now', True))
        reboot()
