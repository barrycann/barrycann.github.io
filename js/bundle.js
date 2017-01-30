'use strict';

angular.module('weatherApp', ['ui.router']).config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: '../views/homeTmpl.html'
    }).state('fiveDay', {
        url: '/fiveDayForecast',
        templateUrl: '../views/fiveDayTmpl.html'
    }).state('data', {
        url: '/data',
        templateUrl: '../views/data.html'
    });

    $urlRouterProvider.otherwise('/');
});
'use strict';

angular.module('weatherApp').directive('dailyDir', function () {
   return {
      restrict: 'E',
      templateUrl: './views/dailyTmpl.html',
      controller: function controller($scope) {}
   };
});
'use strict';

angular.module('weatherApp').directive('footerDir', function () {
   return {
      restrict: 'E',
      templateUrl: './views/footerTmpl.html'
   };
});
'use strict';

angular.module('weatherApp').directive('mainWeatherDir', function () {
   return {
      restrict: 'E',
      templateUrl: './views/weatherTmpl.html'
   };
});
'use strict';

angular.module('weatherApp').directive('navDir', function () {
   return {
      restrict: 'AE',
      templateUrl: './views/navTmpl.html'
   };
});
'use strict';

angular.module('weatherApp').controller('weatherCtrl', function ($scope, weatherService) {

    $scope.getLocation = function () {
        weatherService.getLocation().then(function (data) {
            $scope.loc = data;
            $scope.getWeather(data.lat, data.lon);
            $scope.getForecast(data.city);
        });
    };

    $scope.getWeather = function (a, b) {
        weatherService.getWeather(a, b).then(function (data) {
            $scope.weather = data;
            $scope.image = $scope.weather.image;
            $scope.currentTemp = $scope.weather.currentTemp;
            $scope.wind = $scope.weather.wind;
            $scope.humidity = $scope.weather.humid;
        });
    };

    $scope.getForecast = function (city) {
        weatherService.getForecast(city).then(function (data) {
            $scope.forecast = data;
            if (data.length == 4) {
                $scope.forecastLength = 'Four';
            } else {
                $scope.forecastLength = 'Five';
            }

            console.log($scope.forecast);
        });
    };

    $scope.getLocation();
});
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

angular.module('weatherApp').service('weatherService', function ($http, $q) {

    this.getLocation = function () {
        var def = $q.defer();
        $http.get('http://ip-api.com/json').then(function (response) {
            var parsed = response.data;
            def.resolve(parsed);
        });
        return def.promise;
    };

    this.getWeather = function (lat, lon) {
        var def = $q.defer();
        $http.get('http://api.openweathermap.org/data/2.5/weather?lat=' + lat + '&lon=' + lon + '&appid=48a8f7e3f9111f2ae148e9d7d078c129').then(function (resp) {
            var desc = resp.data.weather[0].description;
            var weather = {
                desc: desc,
                currentTemp: toFahren(resp.data.main.temp),
                wind: windToMph(resp.data.wind.speed),
                humid: resp.data.main.humidity,
                image: getImage(desc)
            };
            def.resolve(weather);
        });
        return def.promise;
    };

    this.getForecast = function (city) {
        var def = $q.defer();
        $http.get('http://api.openweathermap.org/data/2.5/forecast?q=' + city + ',us&appid=48a8f7e3f9111f2ae148e9d7d078c129').then(function (resp) {
            var parsed = resp.data.list;
            console.log(parsed);
            var date = buildDateArray(parsed);
            def.resolve(date);
        });
        return def.promise;
    };

    function toFahren(tempK) {
        return Math.round(tempK * 1.8 - 459);
    }

    // Converts speed in meters/second to miles/hour
    function windToMph(speed) {
        return Math.round(speed * 2.23694 * 10) / 10;
    }

    // Takes info from weather forecast object and puts it into an array of daily forecast objects
    function buildDateArray(arr) {
        var fiveDay = [];
        var date = '';
        var image = '';
        var temps = [];
        var wind = [];
        var humid = [];
        var desc = [];
        var time = 0;

        for (var i = 0; i < arr.length; i++) {
            date = arr[i].dt_txt.substr(0, 10);
            time = arr[i].dt_txt.substr(11, 2);
            temps.push(toFahren(arr[i].main.temp));
            wind.push(arr[i].wind.speed);
            humid.push(arr[i].main.humidity);
            desc.push(arr[i].weather[0].description);
            if (time == '21' || i == arr.length - 1) {
                var windAvg = windToMph(wind.reduce(function (a, b) {
                    return a + b;
                }) / wind.length);
                var humidAvg = humid.reduce(function (a, b) {
                    return a + b;
                }) / humid.length;
                var dailyDesc = findWeather(desc);
                console.log(desc);
                var day = new DailyInfo(moment(date).format('MMM D'), moment(date).format('ddd'), Math.max.apply(Math, _toConsumableArray(temps)), Math.min.apply(Math, _toConsumableArray(temps)), windAvg, Math.round(humidAvg), getImage(dailyDesc));

                fiveDay.push(day);

                date = '';
                temps = [];
                wind = [];
                humid = [];
                desc = [];
            }
        }

        // Checks to see if today's info got into the five day, and removes today (which would be a six day forecast)
        // if(fiveDay.length > 5){
        //     trimmed = fiveDay.splice(1);
        //     return trimmed;
        // }
        return fiveDay;
    }

    // Daily forecast info constructor
    function DailyInfo(date, dayOfWeek, high, low, wind, humid, desc) {
        this.date = date;
        this.dayOfWeek = dayOfWeek;
        this.high = high;
        this.low = low;
        this.wind = wind;
        this.humid = humid;
        this.desc = desc;
    }

    function findWeather(arr) {
        var clearCount = 0;
        var cloudCount = 0;
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] == 'light rain' || arr[i] == 'rain') {
                return 'rain';
            }
            if (arr[i] == 'clear sky') {
                clearCount++;
            }
            if (arr[i] == 'broken clouds') {
                cloudCount++;
            }
        }
        if (clearCount > arr.length / 2) {
            return 'clear sky';
        }
        if (cloudCount >= 2) {
            return 'broken clouds';
        }
        return arr[arr.length - 1];
    }

    function getImage(desc) {
        var theImage = '';
        switch (desc) {
            case 'clear sky':
                theImage = './img/clearSky.jpg';
                break;
            case 'few clouds':
            case 'scattered clouds':
                theImage = './img/PartlyCloudy.jpg';
                break;
            case 'broken clouds':
                theImage = './img/cloudy.jpg';
                break;
            case 'rain':
            case 'shower rain':
            case 'thunderstorm':
                theImage = './img/Rain.jpg';
                break;
            case 'snow':
            case 'mist':
                theImage = './img/heavySnow.jpg';
                break;
            default:
                theImage = './img/PartlyCloudy.jpg';
        }
        return theImage;
    }
});
//# sourceMappingURL=bundle.js.map
