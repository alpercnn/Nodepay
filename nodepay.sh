#!/bin/bash

apt update && apt upgrade -y
sudo apt install nodejs npm -y

npm install axios readline-sync figlet ws

mkdir nodepay
cd nodepay

wget https://raw.githubusercontent.com/kullaniciadi/Nodepay/main/update_token.js
wget https://raw.githubusercontent.com/kullaniciadi/Nodepay/main/nodepay_terminal.js

echo "Kurulum tamamlandı, Repoya geri dönün ve sonraki adıma geçin"
