(function($a){
    'use strict';

    $a.module('ML').controller('iconsInfoMaker', function($scope, $rootScope, $http){
        $rootScope.MLPageDetail = 'Icon Pack Info JSON Maker';
        $rootScope.tabSelect = 7;

        var output = null;
        $scope.isLoading = false;

        var generate = function(icon_pack_info) {
            var file = document.getElementById('csv_input').files[0];

            if (!icon_pack_info || !icon_pack_info.name || !icon_pack_info.id || !file) {
                return alert("Please fill all fields");
            }

            var reader = new FileReader();

            reader.readAsText(file);

            reader.onload = function(event){
                output = {
                    name: icon_pack_info.name,
                    product_id: icon_pack_info.id,
                    icons: {}
                };

                var lines = event.target.result.replace(/"/g,"").replace(/\r/g, "").split('\n');

                for (var i = 0; i < lines.length; i++){
                    var line = lines[i];
                    line = line.split(',');

                    if (line[0]) {
                        for (var j = 0; j < line.length; j++) {
                            line[j] = line[j].trim();
                        }

                        if (line[0].indexOf('Main keywords') !== -1) {
                            line.shift();
                            output.tags = line;
                        } else if (line[0] !== 'Name') {
                            var icon_name = line[0];
                            line.shift();
                            output.icons[icon_name] = line;
                        }
                    }
                }

                save(output);
            };
        };

        var save = function(data){
            if (!data) {
                return;
            }

            var filename = 'package.json';

            if (typeof data === 'object') {
                data = JSON.stringify(data, undefined, 2);
            }

            var blob = new Blob([data], {type: 'text/json'});
            var e = document.createEvent('MouseEvent');
            var a = document.createElement('a');

            a.download = filename;
            a.href = window.URL.createObjectURL(blob);
            a.dataset.downloadurl = ['text/json', a.download, a.href].join(':');
            e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            a.dispatchEvent(e);
        };

        $scope.generate = generate;
        $scope.save = save;
    });
}(angular));