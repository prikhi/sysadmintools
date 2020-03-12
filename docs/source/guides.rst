===================================
Administration & Maintenance Guides
===================================


.. contents::
    :depth: 2
    :local:



Server Rack
===========

.. _switch-hosts-guide:

Switching KVM Ports
-------------------

To switch between hosts on the KVM, press ``PrintScreen`` on the keyboard to
pop up the selection window, then the up/down arrow keys to navigate the host
list, and ``Enter`` to select a host.


Networking
==========

Disabling the Squid Proxy
-------------------------

To save bandwidth, we use a transparent Squid proxy as a network-wide web
cache. Sometime some software doesn't like to play nice with this & you might
need to temporarily disable the re-routing of HTTP requests to the proxy and
just send them straight out of the WAN.

You can do this from Cerberus.

Start by commenting the following line in ``/etc/pf.conf`` (by adding a ``#``
to the front of it)::

    rdr pass on $int_if inet proto tcp from any to any port www -> 192.168.1.254 port 3128

That line is responsible for redirecting all HTTP traffic to the proxy. With it
commented out, you can refresh PF by running ``pf_reconfig`` & the proxy should
be bypassed.

You can verify this by looking at the `Squid Proxy Screen`_ on Zabbix.

To re-enable the Squid proxy, simply remove the ``#`` from the line in
``/etc/pf.conf`` & re-run ``pf_reconfig``.

.. _Squid Proxy Screen: http://monitor.acorn/screens.php?sid=228d1b693ac113fa


Add Static IPs
--------------

You can assign a host a static IP address from Cerberus. You'll need the MAC
address of the host's network interface. The available static IP range is
``150`` to ``189``.

Start by editing ``/usr/local/etc/dhcpd.conf``::

    sudo nano /usr/local/etc/dhcpd.conf

In the ``group { }`` section, add a new ``host { }`` section(ensuring the IP
addresses are in ascending order)::

    host ComputerHostname {
        fixed-address 192.168.1.183
        hardware ethernet AA:BB:CC:11:22:33;
    }

Check your config by running ``dhcpd -t``. If there are no errors, restart the
``isc-dhcpd`` service::

    sudo service isc-dhcpd restart


Killing A Host's Network Access
-------------------------------

If a computer is hogging the internet & you don't know whose it is, you might
just want to kill their network access. You can do this from Cerberus & you
need either their hostname(``MyCarKeys.acorn``), or their IP address.

If you need to figure out who is hogging the internet, try running ``sudo
iftop`` or check http://cerberus.acorn/bandwidth/.

If you only have their hostname, figure out their IP addresses using ``dig``::

    $ dig MyCarKeys.acorn | grep 192.168.1
    MyCarKeys.acorn.	3600	IN	A	192.168.1.36
    cerberus.acorn.		86400	IN	A	192.168.1.254

Now open up ``/etc/pf.conf`` and add the following between the ``block drop log
on $ext_if all`` line and the ``antispoof for $ext_if int`` line::

    block log quick from <HOSTS_IP> to any
    # For Example: block log quick from 192.168.1.36 to any

Now run the ``pf_reconfig`` command(which is just an alias for ``sudo pfctl -f
/etc/pf.conf``) to refresh PF.

This will only block new connections from the Host, you also need to use
``pfctl`` to kill all their current connections::

    $ sudo pfctl -k MyCarKeys.acorn
    # Or use their IP
    $ sudo pfctl -k 192.168.1.36

You might need to run this two or three times to kill all the connections.

To unblock their network access, simply remove or comment out the line you
added to ``/etc/pf.conf`` and re-run ``pf_reconfig``.


Add or Modify DNS Entries
-------------------------

To add, edit, or delete the DNS entries for the ``.acorn`` domain, we use
``nsupdate`` to send commands to the BIND server on Cerberus.

You will need the keyname & secret for DNS updates from
``/etc/namedb/named.conf``.

.. code::

    $ nsupdate -y KEYNAME:KEYSECRET
    > update add <Domain> <TTL> <Type> <Destination>
    > send

    # Adding a CNAME record
    > update add projects.acorn 86400 CNAME aphrodite.acorn
    > send

    # Adding new A & PTR records
    > update add allium.outdoor.acorn 86400 A 192.168.1.246
    > update add 246.1.168.192.in-addr.arpa 86400 PTR allium.outdoor.acorn
    > send

    # Deleting A, TXT, & PTR records
    > update delete barn.outdoor.acorn A
    > update delete barn.outdoor.acorn TXT
    > update delete 245.1.168.192.in-addr.arpa PTR
    > send


.. note::

    The DHCP server will automatically create A, TXT, & PTR records for hosts,
    pointing ``<hostname>.acorn`` to their IP address. These records are tied
    to the hosts MAC address via the TXT record.

    This means that the DNS records will not be updated if a host's MAC address
    changes. To fix this, you need to delete the A, TXT, & PTR records for the
    host and then renew the DHCP lease from the host(e.g., run ``ipconfig
    /renew`` on windows).


Switch Internet from CVALink to Telnes
--------------------------------------

When our main internet(from CVALink) is down, you can follow these directions
to switch to our slower, backup internet(from Telnes).

* Go to back of server rack.
* Unplug black cable(labelled ``WAN``) from port 10 in 2nd patch panel(not the
  switch) and plug it into the Ethernet ``P0`` port on the Telnes modem on
  shelf at top of rack.
* SSH into Cerberus, edit ``/etc/rc.conf``: ``sudo nano /etc/rc.conf``
* Comment out the following lines by adding a # sign in front of them::

      ifconfig_em1="inet 104.245.228.34 netmask 255.255.255.248"
      defaultrouter="104.245.228.33"

* Un-comment the Telnes lines by removing the leading # sign::

    #ifconfig_em1="inet 208.46.125.98 netmask 255.255.255.248"
    #defaultrouter="208.46.125.97"

* You should now have something like this::

    #ifconfig_em1="inet 104.245.228.34 netmask 255.255.255.248"
    #defaultrouter="104.245.228.33"

    ifconfig_em1="inet 208.46.125.98 netmask 255.255.255.248"
    defaultrouter="208.46.125.97"

* Save the file and exit.
* Restart the network interfaces & routing service::

    sudo service netif restart; sudo service routing restart


You should now have a working connection, you can test it by pinging Google::

    ping 8.8.8.8

If there are still internet problems after following this procedure, it's
highly likely that the Telnes connection is down as well.

You should check the lights on the top of the modem, if they are all green
there's a small chance the problem is with Cerberus.

Test that by plugging the modem into a laptop instead of Cerberus and setting
it to connect with the above static IP. If that doesn't work, or the lights
aren't all green, call Telnes support - they will probably ask you to plug the
modem directly into the internet box on the side of the Seed Office warehouse.


Website/VPS
==============

Updating Wordpress
------------------

Backup the files & database first::

    cp -r ~acorn/htdocs ~/acorn_wp_backup
    mysqldump -u acorn acorn > ~/acorn_wp.sql

Then `Log-In`_, visit the `Updates`_ page, and hit
``Update``.

Sometimes the ``reCAPTCHA`` plugin's API keys need to be re-entered. You can
grab those from the `reCAPTCHA Admin`_ by logging in as
``acorncommunity@gmail.com``.

.. _Log-In:   http://www.acorncommunity.org/wp-login.php
.. _Updates:  http://www.acorncommunity.org/wp-admin/update-core.php
.. _reCAPTCHA Admin:    https://www.google.com/recaptcha/admin#site/319279143


Importing Newsletter Emails
---------------------------

You can use this procedure if you have a list of emails you want to add to our
newsletter.

You'll need a text file containing the emails or a CSV file(without a header
row) of ``Name,Email``.

* Log in to our `Sendy server <https://sendy.southernexposure.com>`_.
* Click the ``SESE Retail`` brand.
* Click ``View all lists`` under ``Lists & Subscribers`` in the left menu.
* Click the ``Garden Guide`` list.
* Click the ``Add Subscribers`` button at the top of the page.
* Either select & upload your file, or paste it into the box & submit the form.


Optimizing Images
-----------------

There is a cronjob that runs this monthly, but if you've done a bulk image
upload and want to optimize them immediately, you can run these commands from
the SESE VPS::

    find ~/public_html/images -iname '*.png' -exec optipng -o7 -quiet -preserve -log ~/optipng.log '{}' \;
    find ~/public_html/images -iname '*.jpg' -exec jpegtran -copy none -optimize -progressive -outfile '{}' '{}' \;

Arch Linux
==========

LAN Package Cache
-----------------

We have a shared Arch Linux package cache at ``ssh://cache@aphrodite.acorn:/mnt/DataShare/Misc/Cache/pacman/pkg``.

You can follow these steps to link your Arch Linux workstation up to the shared
cache::

    # become the root user
    sudo -i
    # create ssh key, copy to aphrodite.acorn
    ssh-keygen -t ecdsa
    ssh-copy-id cache@aphrodite.acorn
    # add mountpoint to fstab
    echo 'cache@aphrodite.acorn:/mnt/DataShare/Misc/Cache/pacman/pkg  /var/cache/pacman/pkg   fuse.sshfs  defaults,_netdev,allow_other    0   0' >> /etc/fstab

Clearing pacman's cache will delete all packages except those that are
currently installed. In a shared cache where computers may have different
packages installed, clearing the cache will remove packages other computers
have installed.

You can fix this by changing the ``CleanMethod`` option in ``/etc/pacman.conf``
to ``KeepCurrent``.

.. seealso::

    https://wiki.archlinux.org/index.php/Custom_local_repository_with_ABS_and_gensync#Network_shared_pacman_cache

    https://wiki.archlinux.org/index.php/SSHFS


CUPS Print Server
=================

Install CUPS Server on Slackware
--------------------------------

Install CUPS & the various printer drivers::

    slackpkg install cups hplip gutenprint ghostscript ghostscript-fonts lcms2 poppler

Enable running on boot::

    chmod +x /etc/rc.d/rc.cups

Edit the config at ``/etc/cups/cupsd.conf``::

    Port 631
    ServerName printers.acorn
    ServerAlias *
    Browsing On

    <Location />
        Order allow,deny
        Allow from 127.0.0.1
        Allow from 192.168.1.*
    </Location>
    <Location /admin>
        AuthType Basic
        Order allow,deny
        Allow from 127.0.0.1
        Allow from 192.168.1.*
    </Location>
    <Location /admin/conf>
        AuthType Basic
        Order allow,deny
        Allow from 127.0.0.1
        Allow from 192.168.1.*
    </Location>

Start the server::

    /etc/rc.d/rc.cups start

Visit http://printers.acorn:631, click ``Administration`` & log in as ``root``.
Click ``Find New Printers`` & ``Add Printer``.

For the HP LaserJet M601, use the JetDirect Connection Socket
``socket://yourprinter:9100`` with the HP LaserJet 600 M601 Postscript driver.

**Add PDF Printer(optional)**

Install the additional dependencies::

    slackpkg install libmpc mpfr

Install ``cups-pdf`` via SlackBuilds::

    mkdir ~/builds; cd ~/builds
    wget http://slackbuilds.org/slackbuilds/14.0/office/cups-pdf.tar.gz
    tar xvfz cups-pdf.tar.gz
    cd cups-pdf
    wget http://www.cups-pdf.de/src/cups-pdf_3.0beta1.tar.gz
    ./cups-pdf.SlackBuild
    installpkg /tmp/cups-pdf*_SBo.tgz

**Add HTTP Proxy(optional)**

This allows you to access http://printers.acorn for management, instead of
http://printers.acorn:631.

Add the following Virtual Host to ``/etc/httpd/extra/httpd-vhosts.conf``:

.. code-block:: apache

    <VirtualHost *:80>
        ServerName printers.acorn
        ServerAlias www.printers.acorn
        ProxyRequests Off
        ProxyPass / http://localhost:631/
        <Proxy *>
            Order allow,deny
            Allow from all
        </Proxy>
        <Location />
            ProxyPassReverse http://localhost:631/
            ProxyHTMLEnable On
            ProxyHTMLURLMap / /
        </Location>
    </VirtualHost>


Configure CUPS Clients
----------------------

**Arch Linux**

.. code::

    # Install
    pacman -S libcups

    # Add Server
    echo 'ServerName printers.acorn:631/version=1.1' > /etc/cups/client.conf



Slackware
=========

14.0 Upgrade
------------

Fully upgrade the current distribution::

    slackpkg update
    slackpkg upgrade-all

Run LILO & reboot if the kernel was upgraded::

    lilo -C /etc/lilo.conf
    reboot

Now insert the Slackware 14.0 DVD or mount the ISO::

    mount /dev/sdg /mnt/cdrom

Switch into single-user mode::

    telinit 1

Blacklist the kernel & 3rd party packages by adding the following to
``/etc/slackpkg/blacklist``::

    kernel-firmware
    kernel-headers
    kernel-source
    kernel-generic
    kernel-generic-smp
    kernel-huge
    kernel-huge-smp
    kernel-modules
    kernel-modules-smp
    [0-9]+_SBo
    [0-9]+alien
    [0-9]+compat32

Navigate to the DVD mount point, install the new kernel & update slackpkg::

    cd /mnt/cdrom/slackware64
    installpkg a/kernel-huge-3.2.29-x86_64-1.txz
    installpkg a/kernel-modules-3.2.29-*.txz
    upgradepkg ap/slackpkg-2.82.0-noarch-8.tgz

Find & merge any new config files::

    find /etc -name "*.new"
    vimdiff /etc/slackpkg/mirrors.new /etc/slackpkg/mirrors
    vimdiff /etc/slackpkg/blacklist.new /etc/slackpkg/blacklist

Upgrade the package utilities & tools::

    upgradepkg a/pkgtools-*.tgz
    upgradepkg a/tar-*.tgz
    upgradepkg a/xz-*.tgz
    upgradepkg a/findutils

Update the package list::

    slackpkg update

First upgrade the C libraries, then all packages::

    slackpkg upgrade glibc-solibs
    slackpkg upgrade-all

Remove any deprecated packages::

    slackpkg clean-system

Install the new packages::

    slackpkg install kmod
    slackpkg install-new

After upgrading, use the slackpkg menu or vimdiff to go through the
configuration files and merge/remove .new files::

    find /etc -name "*.new"
    vimdiff /etc/mdadm.conf.new /etc/mdadm.conf
    # Or run
    slackpkg new-config

Edit ``/etc/lilo.conf`` to include an entry to the old kernel::

    image = /boot/vmlinuz-huge-2.6.37.6
        root = <same as above entry>
        label = "2.6.37.6"
        read-only

Reconfigure lilo, switch out of single-user mode and reboot the computer::

    lilo -C /etc/lilo.conf
    telinit 3
    reboot

If the computer booted successfuly, edit ``/boot/lilo.conf`` and remove the
entry to the old kernel. Also remove the kernel lines from
``/etc/slackpkg/blacklist``.

Check for new kernel upgrades::

    slackpkg update
    slackpkg upgrade-all

Reconfigure lilo and reboot if a new kernel was installed::

    lilo -C /etc/lilo.conf
    reboot

Finally, rebuild all custom SlackBuilds and remove the filters from the
/etc/slackpkg/blacklist file.


Windows
=======

Fresh Install
-------------

This is what we do to our Windows workstations after a clean install.


Configuration
+++++++++++++

**Users**

Create an ``SESE`` user as well as an ``Admin`` administrator account.

**Networking**

Open up the IPv4 settings for the network connection & set the ``WINS`` server
to ``192.168.1.254``.

**Misc**

Create links in the Windows Explorer Favorites menu to
``//Aphrodite/Community``, ``//Aphrodite/Personal``, & ``//Vishnu/Business``.

Applications
++++++++++++

There is a folder that contains the setup files for commonly installed
applications at ``//Aphrodite/Community/Applications/5 Fresh Windows Install``.

**Internet Explorer**

Updating to Windows 7 Service Pack 1 & Internet Explorer 11 is required for
computers that will be used with ``StoneEdge``.

The default version of Internet Explorer(and therefore MS Access & StoneEdge)
uses **only** insecure SSL versions & ciphers, which are all disabled on the
SESE website.

If you skip this step, the computer will not be able to import orders from the
website.

**Mumble**

* Follow or cancel the Audio Wizard.
* Follow the Certificate Wizard.
* Add a new favorite server:
    * Name: Acorn Chat Server
    * Address: chat.acorn
    * Port: 64738
    * Username: <hostname of new computer>
    * Password: <blank>
* Set the following options under ``Configure -> Settings``:
    * User Interface -> Enable ``Hide in Tray``
    * User Interface -> Disable ``Use selected item as the chat bar target``
    * Network -> Enable both settings under ``Connection``
    * Overlay -> Disable the Overlay

In the Start Menu, copy the Mumble application to the ``Startup`` folder.

**Firefox/Chrome**

Add the following bookmarks:

* `Acorn Accounting <http://accounting.acorn>`_
* `Acorn Project Tracker <http://projects.acorn>`_
* `Acorn Wiki <http://wiki.acorn>`_

Add the following addons/extensions:

* `HTTPSeverywhere <https://www.eff.org/https-everywhere>`_
* `uBlock Origin <https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/>`_
* `Disconnect <https://disconnect.me/>`_

**Zabbix Monitoring Agent**

Grab the agent archive from ``\\Aphrodite\Community\Applications\5 Fresh
Windows Install\zabbix_agents.win.zip`` or from the `Downloads Page
<http://www.zabbix.com/download.php>`_.

Extract it to ``C:\zabbix\`` and edit the ``conf/zabbix_agentd.win.conf`` file
with notepad, changing the following settings::

    Server=monitor.acorn
    ServerActive=monitor.acorn
    Hostname=<workstations_hostname>

Save the file to ``C:\zabbix_agentd.conf``. Hit ``Win+R`` and enter ``cmd`` to
open a terminal. ``cd`` to the exracted ``bin\win32`` or ``bin\win64``
directory and run ``zabbix_agentd.exe -i`` then ``zabbix_agentd.exe -s``.

Open up Windows firewall and manually add entries allowing the
``zabbix_agentd.exe`` through.

Now head to `Acorn's Zabbix Server <http://monitor.acorn>`_ and log in. At the
``Configuration -> Hosts`` Page, click the ``Create host`` button.

Set the following options:

* Hostname - the same Hostname defined in the workstation's config file.
* Groups - Windows workstations
* Agent interface - Connect to DNS. The DNS name should be "<hostname>.acorn"
* Templates - OS Windows Workstation. Be sure to click add before clicking save!
* Inventory - Set to manual or automatic and add any relevant details that you know.

Save the new host.

After a short while, the host's Z icon should turn blue, this means the host is
being monitored correctly.  You can check the latest data by selecting
``Monitoring -> Latest Data`` and selecting the new workstation from the
dropdown menus.

Tweaks
++++++

**Unfragmented Paging File**

Windows normally increases the size of the paging file as needed. When the disk
starts to fill up this can cause the paging file to become fragmented.

This can be circumvented by allocating a single size to the paging file instead
of using the default range, immediately after installing Windows.

*Windows 7*

* Right-click ``Computer`` in Start Menu.
* Click ``Properties``.
* Click ``Advanced system settings`` link.
* Click ``Performance Settings...`` in ``Advanced Tab``.
* Click ``Change...`` in ``Virtual memory`` box in ``Advanced Tab``.
* Uncheck ``Automatically manage paging file size for all drives``
* Click ``Custom Size:`` radio button.
* Enter the desired size (size of RAM + 300MB allows for a full core dump).
* Click ``Set``.
* Click ``OK`` for all dialogs.
* Restart Computer.
