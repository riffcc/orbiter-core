#!/bin/bash

cd /app/data/lenses

source ~/.bashrc

# Fetch the domain from env vars if set
DOMAIN=${DOMAIN:-lens.orbiter.riff.cc}

orb run --domain=$DOMAIN