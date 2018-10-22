#!/usr/bin/env bash
docker run --rm -it --env-file .env.local -v $(pwd):/usr/src/app -p 1337:1337 commentbox.io-analytics /bin/bash