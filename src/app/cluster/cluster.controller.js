  /* global confirm:false, alert:false */
/* jshint loopfunc: true */
/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/**
 * @ngdoc function
 * @name zeppelinWebApp.controller:InterpreterCtrl
 * @description
 * # InterpreterCtrl
 * Controller of interpreter, manage the note (update)
 */
angular.module('zeppelinWebApp').controller('ClusterCtrl', function($scope, $route, $routeParams, $location, $rootScope, $http, $interval, $modal, $log, baseUrlSrv) {
  var remoteSettingToLocalSetting = function(setting) {
    var ui = [];
    for (var key in setting.urls) {
      ui.push({
        'tag': key,
        'url': setting.urls[key]
      });
    }
    console.log(ui);
    return {
      id : setting.id,
      name : setting.name,
      memory : setting.slaves,
      status : setting.status,
      //master: setting.urls.master,
      type : setting.type,
      ui: ui
    };
  };

  var getClusterSettings = function() {
    $http.get(baseUrlSrv.getRestApiBase()+'/cluster/setting').
      success(function(data, status, headers, config) {
        var interpreterSettings = [];
        console.log('getInterpreterSettings=%o', data);

        for (var settingId in data.body) {
          var setting = data.body[settingId];
          console.log(setting);
          interpreterSettings.push(remoteSettingToLocalSetting(setting));

          getStatusCluster(setting.id);
        }
        console.log('interpreterSettings=%o', interpreterSettings);
        $scope.interpreterSettings = interpreterSettings;

      }).
      error(function(data, status, headers, config) {
        console.log('Error %o %o', status, data.message);
      });
  };

  $scope.updateClusterSetting = function(settingId) {
    var result = confirm('Do you want to update this cluster and restart with new memory?');
    if (!result) {
      return;
    }

    $scope.addNewInterpreterProperty(settingId);

    var request;
    var name = '';

    for (var i=0; i < $scope.interpreterSettings.length; i++) {
      var setting = $scope.interpreterSettings[i];
      if(setting.id === settingId) {
        console.log($scope.interpreterSettings);
        request = setting.memory;
        $scope.interpreterSettings[i].memory = setting.memory;
        name = setting.name;
        break;
      }
    }
    console.log(request);
    $http.put(baseUrlSrv.getRestApiBase()+'/cluster/setting/'+settingId, request).
    success(function(data, status, headers, config) {
      getClusterSettings();
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  $scope.addNewClusterSetting = function(type) {
    $scope.showAddNewSetting = false;
    var name = '';
    var newSetting = {};
    console.log(type);
    //$scope.addNewInterpreterProperty();
    if (type === 'spark') {
      if (!$scope.newClusterSettingSpark.name || !$scope.newClusterSettingSpark.memory) {
        alert('Please determine name and memory');
        return;
      }
      name = $scope.newClusterSettingSpark.name;
      newSetting = {
        name : $scope.newClusterSettingSpark.name,
        slaves : Math.floor($scope.newClusterSettingSpark.memory / 7)
      };
    } else if(type === 'hadoop') {
      if (!$scope.newClusterSettingHadoop.name || !$scope.newClusterSettingHadoop.slaves) {
        alert('Please determine name and memory');
        return;
      }
      name = $scope.newClusterSettingHadoop.name;
      var instance = 'm3.xlarge'
      if ($scope.instance == 1) {
        type = 'm3.8xlarge'
      }
      newSetting = {
        name : $scope.newClusterSettingHadoop.name,
        slaves : $scope.newClusterSettingHadoop.slaves,
        instance: instance
      };
    } else {
      if (!$scope.newClusterSettingRedshift.name || !$scope.newClusterSettingRedshift.nodes) {
        alert('Please determine name and memory');
        return;
      }
      name = $scope.newClusterSettingRedshift.name;
      var instance = 'ds2.xlarge'
      if ($scope.instance == 1) {
        type = 'ds2.8xlarge'
      }
      newSetting = {
        name : $scope.newClusterSettingRedshift.name,
        slaves : $scope.newClusterSettingRedshift.nodes,
        instance : instance
      };
    }
    $http.post(baseUrlSrv.getRestApiBase()+'/cluster/setting/' + type, newSetting).
      success(function(data, status, headers, config) {
        console.log('Success %o %o', status, data.message);
        getClusterSettings();
      }).
      error(function(data, status, headers, config) {
        console.log('Error %o %o', status, data.message);
      });
  };

  var getStatusCluster = function(clusterId) {
      console.log(clusterId);
      var interval = $interval(function(){
        $http.get(baseUrlSrv.getRestApiBase()+'/cluster/status/' + clusterId).
          success(function(data, status, headers, config) {
            console.log(data);
            if ((data.message === 'waiting') || (data.message === 'success') || (data.message.indexOf('ec2') >= 0) || (data.message === 'available') || (data.message === 'removing')) {
              console.log('entre');
              $interval.cancel(interval);
            }
          }).
          error(function(data, status, headers, config) {
            console.log('Error %o %o', status, data.message);
          });
      }, 6000);
    };

  $scope.addNewInterpreterProperty = function(settingId) {
    if(settingId === undefined) {
      if (!$scope.newInterpreterSetting.propertyKey || $scope.newInterpreterSetting.propertyKey === '') {
        return;
      }
      $scope.newInterpreterSetting.properties[$scope.newInterpreterSetting.propertyKey] = { value : $scope.newInterpreterSetting.propertyValue};
      $scope.newInterpreterSetting.propertyValue = '';
      $scope.newInterpreterSetting.propertyKey = '';
    }
    else {
      for (var i=0; i < $scope.interpreterSettings.length; i++) {
        var setting = $scope.interpreterSettings[i];
        if (setting.id === settingId){
          if (!setting.propertyKey || setting.propertyKey === '') {
            return;
          }
          setting.properties[setting.propertyKey] = { value : setting.propertyValue };
          setting.propertyValue = '';
          setting.propertyKey = '';
          break;
        }
      }
    }
  };
  $scope.removeClusterSetting = function(settingId) {
    var result = confirm('Do you want to delete this cluster?');
    if (!result) {
      return;
    }
    $scope.tag='removing';
    $http.delete(baseUrlSrv.getRestApiBase()+'/cluster/setting/'+settingId).
      success(function(data, status, headers, config) {
        for (var i=0; i < $scope.interpreterSettings.length; i++) {
          var setting = $scope.interpreterSettings[i];
          if (setting.id === settingId) {
            $scope.interpreterSettings.splice(i, 1);
            //$interval.cancel(interval);
            break;
          }
        }
      }).
      error(function(data, status, headers, config) {
        console.log('Error %o %o', status, data.message);
      });
  };
  var init = function() {
    // when interpreter page opened after seeing non-default looknfeel note, the css remains unchanged. that's what interpreter page want. Force set default looknfeel.
    $rootScope.$emit('setLookAndFeel', 'default');
    $scope.interpreterSettings = [];
    $scope.availableInterpreters = {};
    getClusterSettings();
  };

  init();
});
