# Beatnik OS Updating Logic using Hardware API

## Overview
The goal is to add a route so the following dependencies get updated on the device using the Hardware API.
- Beatnik Bleno
- Beatnik Controller Docker
- CamillaDSP repo
- Beatnik Hardware API itself


##
All the relevant files are located in the user directory.
- Beatnik Bleno -> trigger setup.sh
- Beatnik Controller Docker -> docker pull
- CamillaDSP repo -> git pull latest master
- Beatnik Hardware API itself -> trigger debian updta

##
Create a new service and routes. Also create an example for usage like the snapcast.service.ts

Sample session:
beatnik@beatnik-008:~ $ ls
beatnik-bleno  beatnik-controller  beatnik-hardware-api  camilladsp
beatnik@beatnik-008:~ $ cd beatnik-bleno/
beatnik@beatnik-008:~/beatnik-bleno $ ls
beatnik-bleno.service  dist  node_modules  package.json  package-lock.json  setup.sh
beatnik@beatnik-008:~/beatnik-bleno $ 