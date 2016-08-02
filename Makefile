# sudo npm i -g sintaxi/harp#v0.21.0-pre
default:
	harp compile _harp out/
	mv out/* ./

