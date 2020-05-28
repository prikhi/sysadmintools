#!/bin/bash

# This script ensures a clean shutdown of the VM cluster when the 30A UPS loses
# power.

# See the network documentation for steps on how to start the cluster after a
# clean shutdown:
# https://acorn-networking.readthedocs.io/en/latest/vm_cluster/maintenance.html#starting-up


source /home/stack/admin-openrc.sh
export OS_PROJECT_NAME=acorn

# Shutdown VMs
VMS=$(openstack server list -f value -c ID)
for VM in $VMS; do
    openstack server stop "${VM}"
done

# Wait for all VMs to shutdown
while [[ "$(openstack server list -f value -c Status | grep -v SHUTOFF | wc -l)" != "0" ]]; do
    sleep 10
done

# Shutdown the Compute nodes
ssh stack-compute-1 sudo poweroff
ssh stack-compute-2 sudo poweroff
ssh stack-compute-3 sudo poweroff
sleep 30

# Disable Storage Rebalancing
ceph osd set noout 

# Shutdown the Storage nodes
ssh stack-storage-1 sudo poweroff
ssh stack-storage-2 sudo poweroff
ssh stack-storage-3 sudo poweroff
sleep 30

# Enable pacemaker maintenance mode
pcs property set maintenance-mode=true

# Shutdown Controllers in staggered format
ssh stack-controller-3 sudo poweroff
sleep 60
ssh stack-controller-2 sudo poweroff
sleep 60

# Exit script & perform shutdown of this server
exit 0
