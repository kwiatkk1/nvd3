(function(){

var nv = window.nv || {};

nv.version = '0.0.1a';
nv.dev = false //set false when in production

window.nv = nv;

nv.tooltip = {}; // For the tooltip system
nv.utils = {}; // Utility subsystem
nv.models = {}; //stores all the possible models/components
nv.charts = {}; //stores all the ready to use charts
nv.graphs = []; //stores all the graphs currently on the page
nv.logs = {}; //stores some statistics and potential error messages

nv.dispatch = d3.dispatch('render_start', 'render_end');

// *************************************************************************
//  Development render timers - disabled if dev = false

if (nv.dev) {
  nv.dispatch.on('render_start', function(e) {
    nv.logs.startTime = +new Date();
  });

  nv.dispatch.on('render_end', function(e) {
    nv.logs.endTime = +new Date();
    nv.logs.totalTime = nv.logs.endTime - nv.logs.startTime;
    nv.log('total', nv.logs.totalTime); // used for development, to keep track of graph generation times
  });
}

// ********************************************
//  Public Core NV functions

// Logs all arguments, and returns the last so you can test things in place
nv.log = function() {
  if (nv.dev && console.log && console.log.apply)
    console.log.apply(console, arguments)
  else if (nv.dev && console.log && Function.prototype.bind) {
    var log = Function.prototype.bind.call(console.log, console);
    log.apply(console, arguments);
  }
  return arguments[arguments.length - 1];
};


nv.render = function render(step) {
  step = step || 1; // number of graphs to generate in each timeout loop

  nv.render.active = true;
  nv.dispatch.render_start();

  setTimeout(function() {
    var chart, graph;

    for (var i = 0; i < step && (graph = nv.render.queue[i]); i++) {
      chart = graph.generate();
      if (typeof graph.callback == typeof(Function)) graph.callback(chart);
      nv.graphs.push(chart);
    }

    nv.render.queue.splice(0, i);

    if (nv.render.queue.length) setTimeout(arguments.callee, 0);
    else { nv.render.active = false; nv.dispatch.render_end(); }
  }, 0);
};

nv.render.active = false;
nv.render.queue = [];

nv.addGraph = function(obj) {
  if (typeof arguments[0] === typeof(Function))
    obj = {generate: arguments[0], callback: arguments[1]};

  nv.render.queue.push(obj);

  if (!nv.render.active) nv.render();
};

nv.identity = function(d) { return d; };

nv.strip = function(s) { return s.replace(/(\s|&)/g,''); };

function daysInMonth(month,year) {
  return (new Date(year, month+1, 0)).getDate();
}

function d3_time_range(floor, step, number) {
  return function(t0, t1, dt) {
    var time = floor(t0), times = [];
    if (time < t0) step(time);
    if (dt > 1) {
      while (time < t1) {
        var date = new Date(+time);
        if ((number(date) % dt === 0)) times.push(date);
        step(time);
      }
    } else {
      while (time < t1) { times.push(new Date(+time)); step(time); }
    }
    return times;
  };
}

d3.time.monthEnd = function(date) {
  return new Date(date.getFullYear(), date.getMonth(), 0);
};

d3.time.monthEnds = d3_time_range(d3.time.monthEnd, function(date) {
    date.setUTCDate(date.getUTCDate() + 1);
    date.setDate(daysInMonth(date.getMonth() + 1, date.getFullYear()));
  }, function(date) {
    return date.getMonth();
  }
);


/*****
 * A no-frills tooltip implementation.
 *****/


(function() {

  var nvtooltip = window.nv.tooltip = {};

  nvtooltip.show = function(pos, content, gravity, dist, parentContainer, classes) {

    var container = document.createElement('div');
        container.className = 'nvtooltip ' + (classes ? classes : 'xy-tooltip');

    gravity = gravity || 's';
    dist = dist || 20;

    var body = parentContainer;
    if ( !parentContainer || parentContainer.tagName.match(/g|svg/i)) {
        //If the parent element is an SVG element, place tooltip in the <body> element.
        body = document.getElementsByTagName('body')[0];
    }

    container.innerHTML = content;
    container.style.left = 0;
    container.style.top = 0;
    container.style.opacity = 0;

    body.appendChild(container);

    var height = parseInt(container.offsetHeight),
        width = parseInt(container.offsetWidth),
        windowWidth = nv.utils.windowSize().width,
        windowHeight = nv.utils.windowSize().height,
        scrollTop = window.scrollY,
        scrollLeft = window.scrollX,
        left, top;

    windowHeight = window.innerWidth >= document.body.scrollWidth ? windowHeight : windowHeight - 16;
    windowWidth = window.innerHeight >= document.body.scrollHeight ? windowWidth : windowWidth - 16;

    var tooltipTop = function ( Elem ) {
        var offsetTop = top;
        do {
            if( !isNaN( Elem.offsetTop ) ) {
                offsetTop += (Elem.offsetTop);
            }
        } while( Elem = Elem.offsetParent );
        return offsetTop;
    }

    var tooltipLeft = function ( Elem ) {
        var offsetLeft = left;
        do {
            if( !isNaN( Elem.offsetLeft ) ) {
                offsetLeft += (Elem.offsetLeft);
            }
        } while( Elem = Elem.offsetParent );
        return offsetLeft;
    }

    switch (gravity) {
      case 'e':
        left = pos[0] - width - dist;
        top = pos[1] - (height / 2);
        var tLeft = tooltipLeft(container);
        var tTop = tooltipTop(container);
        if (tLeft < scrollLeft) left = pos[0] + dist > scrollLeft ? pos[0] + dist : scrollLeft - tLeft + left;
        if (tTop < scrollTop) top = scrollTop - tTop + top;
        if (tTop + height > scrollTop + windowHeight) top = scrollTop + windowHeight - tTop + top - height;
        break;
      case 'w':
        left = pos[0] + dist;
        top = pos[1] - (height / 2);
        if (tLeft + width > windowWidth) left = pos[0] - width - dist;
        if (tTop < scrollTop) top = scrollTop + 5;
        if (tTop + height > scrollTop + windowHeight) top = scrollTop - height - 5;
        break;
      case 'n':
        left = pos[0] - (width / 2) - 5;
        top = pos[1] + dist;
        var tLeft = tooltipLeft(container);
        var tTop = tooltipTop(container);
        if (tLeft < scrollLeft) left = scrollLeft + 5;
        if (tLeft + width > windowWidth) left = left - width/2 + 5;
        if (tTop + height > scrollTop + windowHeight) top = scrollTop + windowHeight - tTop + top - height;
        break;
      case 's':
        left = pos[0] - (width / 2);
        top = pos[1] - height - dist;
        var tLeft = tooltipLeft(container);
        var tTop = tooltipTop(container);
        if (tLeft < scrollLeft) left = scrollLeft + 5;
        if (tLeft + width > windowWidth) left = left - width/2 + 5;
        if (scrollTop > tTop) top = scrollTop;
        break;
    }


    container.style.left = left+'px';
    container.style.top = top+'px';
    container.style.opacity = 1;
    container.style.position = 'absolute'; //fix scroll bar issue
    container.style.pointerEvents = 'none'; //fix scroll bar issue

    return container;
  };

  nvtooltip.cleanup = function() {

      // Find the tooltips, mark them for removal by this class (so others cleanups won't find it)
      var tooltips = document.getElementsByClassName('nvtooltip');
      var purging = [];
      while(tooltips.length) {
        purging.push(tooltips[0]);
        tooltips[0].style.transitionDelay = '0 !important';
        tooltips[0].style.opacity = 0;
        tooltips[0].className = 'nvtooltip-pending-removal';
      }


      setTimeout(function() {

          while (purging.length) {
             var removeMe = purging.pop();
              removeMe.parentNode.removeChild(removeMe);
          }
    }, 500);
  };


})();

nv.utils.windowSize = function() {
    // Sane defaults
    var size = {width: 640, height: 480};

    // Earlier IE uses Doc.body
    if (document.body && document.body.offsetWidth) {
        size.width = document.body.offsetWidth;
        size.height = document.body.offsetHeight;
    }

    // IE can use depending on mode it is in
    if (document.compatMode=='CSS1Compat' &&
        document.documentElement &&
        document.documentElement.offsetWidth ) {
        size.width = document.documentElement.offsetWidth;
        size.height = document.documentElement.offsetHeight;
    }

    // Most recent browsers use
    if (window.innerWidth && window.innerHeight) {
        size.width = window.innerWidth;
        size.height = window.innerHeight;
    }
    return (size);
};



// Easy way to bind multiple functions to window.onresize
// TODO: give a way to remove a function after its bound, other than removing all of them
nv.utils.windowResize = function(fun){
  var oldresize = window.onresize;

  window.onresize = function(e) {
    if (typeof oldresize == 'function') oldresize(e);
    fun(e);
  }
}

// Backwards compatible way to implement more d3-like coloring of graphs.
// If passed an array, wrap it in a function which implements the old default
// behavior
nv.utils.getColor = function(color) {
    if (!arguments.length) return nv.utils.defaultColor(); //if you pass in nothing, get default colors back

    if( Object.prototype.toString.call( color ) === '[object Array]' )
        return function(d, i) { return d.color || color[i % color.length]; };
    else
        return color;
        //can't really help it if someone passes rubbish as color
}

// Default color chooser uses the index of an object as before.
nv.utils.defaultColor = function() {
    var colors = d3.scale.category20().range();
    return function(d, i) { return d.color || colors[i % colors.length] };
}


// Returns a color function that takes the result of 'getKey' for each series and
// looks for a corresponding color from the dictionary,
nv.utils.customTheme = function(dictionary, getKey, defaultColors) {
  getKey = getKey || function(series) { return series.key }; // use default series.key if getKey is undefined
  defaultColors = defaultColors || d3.scale.category20().range(); //default color function

  var defIndex = defaultColors.length; //current default color (going in reverse)

  return function(series, index) {
    var key = getKey(series);

    if (!defIndex) defIndex = defaultColors.length; //used all the default colors, start over

    if (typeof dictionary[key] !== "undefined")
      return (typeof dictionary[key] === "function") ? dictionary[key]() : dictionary[key];
    else
      return defaultColors[--defIndex]; // no match in dictionary, use default color
  }
}



// From the PJAX example on d3js.org, while this is not really directly needed
// it's a very cool method for doing pjax, I may expand upon it a little bit,
// open to suggestions on anything that may be useful
nv.utils.pjax = function(links, content) {
  d3.selectAll(links).on("click", function() {
    history.pushState(this.href, this.textContent, this.href);
    load(this.href);
    d3.event.preventDefault();
  });

  function load(href) {
    d3.html(href, function(fragment) {
      var target = d3.select(content).node();
      target.parentNode.replaceChild(d3.select(fragment).select(content).node(), target);
      nv.utils.pjax(links, content);
    });
  }

  d3.select(window).on("popstate", function() {
    if (d3.event.state) load(d3.event.state);
  });
}

/* For situations where we want to approximate the width in pixels for an SVG:text element.
Most common instance is when the element is in a display:none; container. 
Forumla is : text.length * font-size * constant_factor
*/
nv.utils.calcApproxTextWidth = function (svgTextElem) {
    if (svgTextElem instanceof d3.selection) {
        var fontSize = parseInt(svgTextElem.style("font-size").replace("px",""));
        var textLength = svgTextElem.text().length;

        return textLength * fontSize * 0.5; 
    }
    return 0;
};
nv.models.axis = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var axis = d3.svg.axis()
    ;

  var margin = {top: 0, right: 0, bottom: 0, left: 0}
    , width = 75 //only used for tickLabel currently
    , height = 60 //only used for tickLabel currently
    , scale = d3.scale.linear()
    , axisLabelText = null
    , showMaxMin = true //TODO: showMaxMin should be disabled on all ordinal scaled axes
    , highlightZero = true
    , rotateLabels = 0
    , rotateYLabel = true
    , staggerLabels = false
    , isOrdinal = false
    , ticks = null
    ;

  axis
    .scale(scale)
    .orient('bottom')
    .tickFormat(function(d) { return d })
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var scale0;

  //============================================================


  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this);


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-axis').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-axis');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g')

      //------------------------------------------------------------


      if (ticks !== null)
        axis.ticks(ticks);
      else if (axis.orient() == 'top' || axis.orient() == 'bottom')
        axis.ticks(Math.abs(scale.range()[1] - scale.range()[0]) / 100);


      //TODO: consider calculating width/height based on whether or not label is added, for reference in charts using this component


      d3.transition(g)
          .call(axis);

      scale0 = scale0 || axis.scale();

      var fmt = axis.tickFormat();
      if (fmt == null) {
        fmt = scale0.tickFormat();
      }

      var axisLabel = g.selectAll('text.nv-axislabel')
          .data([axisLabelText || null]);
      axisLabel.exit().remove();
      switch (axis.orient()) {
        case 'top':
          axisLabel.enter().append('text').attr('class', 'nv-axislabel');
          var w = (scale.range().length==2) ? scale.range()[1] : (scale.range()[scale.range().length-1]+(scale.range()[1]-scale.range()[0]));
          axisLabel
              .attr('text-anchor', 'middle')
              .attr('y', 0)
              .attr('x', w/2);
          if (showMaxMin) {
            var axisMaxMin = wrap.selectAll('g.nv-axisMaxMin')
                           .data(scale.domain());
            axisMaxMin.enter().append('g').attr('class', 'nv-axisMaxMin').append('text');
            axisMaxMin.exit().remove();
            axisMaxMin
                .attr('transform', function(d,i) {
                  return 'translate(' + scale(d) + ',0)'
                })
              .select('text')
                .attr('dy', '0em')
                .attr('y', -axis.tickPadding())
                .attr('text-anchor', 'middle')
                .text(function(d,i) {
                  var v = fmt(d);
                  return ('' + v).match('NaN') ? '' : v;
                });
            d3.transition(axisMaxMin)
                .attr('transform', function(d,i) {
                  return 'translate(' + scale.range()[i] + ',0)'
                });
          }
          break;
        case 'bottom':
          var xLabelMargin = 36;
          var maxTextWidth = 30;
          var xTicks = g.selectAll('g').select("text");
          if (rotateLabels%360) {
            //Calculate the longest xTick width
            xTicks.each(function(d,i){
              var width = this.getBBox().width;
              if(width > maxTextWidth) maxTextWidth = width;
            });
            //Convert to radians before calculating sin. Add 30 to margin for healthy padding.
            var sin = Math.abs(Math.sin(rotateLabels*Math.PI/180));
            var xLabelMargin = (sin ? sin*maxTextWidth : maxTextWidth)+30;
            //Rotate all xTicks
            xTicks
              .attr('transform', function(d,i,j) { return 'rotate(' + rotateLabels + ' 0,0)' })
              .attr('text-anchor', rotateLabels%360 > 0 ? 'start' : 'end');
          }
          axisLabel.enter().append('text').attr('class', 'nv-axislabel');
          var w = (scale.range().length==2) ? scale.range()[1] : (scale.range()[scale.range().length-1]+(scale.range()[1]-scale.range()[0]));
          axisLabel
              .attr('text-anchor', 'middle')
              .attr('y', xLabelMargin)
              .attr('x', w/2);
          if (showMaxMin) {
          //if (showMaxMin && !isOrdinal) {
            var axisMaxMin = wrap.selectAll('g.nv-axisMaxMin')
                           //.data(scale.domain())
                           .data([scale.domain()[0], scale.domain()[scale.domain().length - 1]]);
            axisMaxMin.enter().append('g').attr('class', 'nv-axisMaxMin').append('text');
            axisMaxMin.exit().remove();
            axisMaxMin
                .attr('transform', function(d,i) {
                  return 'translate(' + (scale(d) + (isOrdinal ? scale.rangeBand() / 2 : 0)) + ',0)'
                })
              .select('text')
                .attr('dy', '.71em')
                .attr('y', axis.tickPadding())
                .attr('transform', function(d,i,j) { return 'rotate(' + rotateLabels + ' 0,0)' })
                .attr('text-anchor', rotateLabels ? (rotateLabels%360 > 0 ? 'start' : 'end') : 'middle')
                .text(function(d,i) {
                  var v = fmt(d);
                  return ('' + v).match('NaN') ? '' : v;
                });
            d3.transition(axisMaxMin)
                .attr('transform', function(d,i) {
                  //return 'translate(' + scale.range()[i] + ',0)'
                  //return 'translate(' + scale(d) + ',0)'
                  return 'translate(' + (scale(d) + (isOrdinal ? scale.rangeBand() / 2 : 0)) + ',0)'
                });
          }
          if (staggerLabels)
            xTicks
                .attr('transform', function(d,i) { return 'translate(0,' + (i % 2 == 0 ? '0' : '12') + ')' });

          break;
        case 'right':
          axisLabel.enter().append('text').attr('class', 'nv-axislabel');
          axisLabel
              .attr('text-anchor', rotateYLabel ? 'middle' : 'begin')
              .attr('transform', rotateYLabel ? 'rotate(90)' : '')
              .attr('y', rotateYLabel ? (-Math.max(margin.right,width) + 12) : -10) //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
              .attr('x', rotateYLabel ? (scale.range()[0] / 2) : axis.tickPadding());
          if (showMaxMin) {
            var axisMaxMin = wrap.selectAll('g.nv-axisMaxMin')
                           .data(scale.domain());
            axisMaxMin.enter().append('g').attr('class', 'nv-axisMaxMin').append('text')
                .style('opacity', 0);
            axisMaxMin.exit().remove();
            axisMaxMin
                .attr('transform', function(d,i) {
                  return 'translate(0,' + scale(d) + ')'
                })
              .select('text')
                .attr('dy', '.32em')
                .attr('y', 0)
                .attr('x', axis.tickPadding())
                .attr('text-anchor', 'start')
                .text(function(d,i) {
                  var v = fmt(d);
                  return ('' + v).match('NaN') ? '' : v;
                });
            d3.transition(axisMaxMin)
                .attr('transform', function(d,i) {
                  return 'translate(0,' + scale.range()[i] + ')'
                })
              .select('text')
                .style('opacity', 1);
          }
          break;
        case 'left':
          /*
          //For dynamically placing the label. Can be used with dynamically-sized chart axis margins
          var yTicks = g.selectAll('g').select("text");
          yTicks.each(function(d,i){
            var labelPadding = this.getBBox().width + axis.tickPadding() + 16;
            if(labelPadding > width) width = labelPadding;
          });
          */
          axisLabel.enter().append('text').attr('class', 'nv-axislabel');
          axisLabel
              .attr('text-anchor', rotateYLabel ? 'middle' : 'end')
              .attr('transform', rotateYLabel ? 'rotate(-90)' : '')
              .attr('y', rotateYLabel ? (-Math.max(margin.left,width) + 12) : -10) //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
              .attr('x', rotateYLabel ? (-scale.range()[0] / 2) : -axis.tickPadding());
          if (showMaxMin) {
            var axisMaxMin = wrap.selectAll('g.nv-axisMaxMin')
                           .data(scale.domain());
            axisMaxMin.enter().append('g').attr('class', 'nv-axisMaxMin').append('text')
                .style('opacity', 0);
            axisMaxMin.exit().remove();
            axisMaxMin
                .attr('transform', function(d,i) {
                  return 'translate(0,' + scale0(d) + ')'
                })
              .select('text')
                .attr('dy', '.32em')
                .attr('y', 0)
                .attr('x', -axis.tickPadding())
                .attr('text-anchor', 'end')
                .text(function(d,i) {
                  var v = fmt(d);
                  return ('' + v).match('NaN') ? '' : v;
                });
            d3.transition(axisMaxMin)
                .attr('transform', function(d,i) {
                  return 'translate(0,' + scale.range()[i] + ')'
                })
              .select('text')
                .style('opacity', 1);
          }
          break;
      }
      axisLabel
          .text(function(d) { return d });


      if (showMaxMin && (axis.orient() === 'left' || axis.orient() === 'right')) {
        //check if max and min overlap other values, if so, hide the values that overlap
        g.selectAll('g') // the g's wrapping each tick
            .each(function(d,i) {
              d3.select(this).select('text').attr('opacity', 1);
              if (scale(d) < scale.range()[1] + 10 || scale(d) > scale.range()[0] - 10) { // 10 is assuming text height is 16... if d is 0, leave it!
                if (d > 1e-10 || d < -1e-10) // accounts for minor floating point errors... though could be problematic if the scale is EXTREMELY SMALL
                  d3.select(this).attr('opacity', 0);
                
                d3.select(this).select('text').attr('opacity', 0); // Don't remove the ZERO line!!
              }
            });

        //if Max and Min = 0 only show min, Issue #281
        if (scale.domain()[0] == scale.domain()[1] && scale.domain()[0] == 0)
          wrap.selectAll('g.nv-axisMaxMin')
            .style('opacity', function(d,i) { return !i ? 1 : 0 });

      }

      if (showMaxMin && (axis.orient() === 'top' || axis.orient() === 'bottom')) {
        var maxMinRange = [];
        wrap.selectAll('g.nv-axisMaxMin')
            .each(function(d,i) {
              try {
                  if (i) // i== 1, max position
                      maxMinRange.push(scale(d) - this.getBBox().width - 4)  //assuming the max and min labels are as wide as the next tick (with an extra 4 pixels just in case)
                  else // i==0, min position
                      maxMinRange.push(scale(d) + this.getBBox().width + 4)
              }catch (err) {
                  if (i) // i== 1, max position
                      maxMinRange.push(scale(d) - 4)  //assuming the max and min labels are as wide as the next tick (with an extra 4 pixels just in case)
                  else // i==0, min position
                      maxMinRange.push(scale(d) + 4)
              }
            });
        g.selectAll('g') // the g's wrapping each tick
            .each(function(d,i) {
              if (scale(d) < maxMinRange[0] || scale(d) > maxMinRange[1]) {
                if (d > 1e-10 || d < -1e-10) // accounts for minor floating point errors... though could be problematic if the scale is EXTREMELY SMALL
                  d3.select(this).remove();
                else
                  d3.select(this).select('text').remove(); // Don't remove the ZERO line!!
              }
            });
      }


      //highlight zero line ... Maybe should not be an option and should just be in CSS?
      if (highlightZero)
        g.selectAll('.tick')
          .filter(function(d) { return !parseFloat(Math.round(d.__data__*100000)/1000000) && (d.__data__ !== undefined) }) //this is because sometimes the 0 tick is a very small fraction, TODO: think of cleaner technique
            .classed('zero', true);

      //store old scales for use in transitions on update
      scale0 = scale.copy();

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.axis = axis;

  d3.rebind(chart, axis, 'orient', 'tickValues', 'tickSubdivide', 'tickSize', 'tickPadding', 'tickFormat');
  d3.rebind(chart, scale, 'domain', 'range', 'rangeBand', 'rangeBands'); //these are also accessible by chart.scale(), but added common ones directly for ease of use

  chart.margin = function(_) {
    if(!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  }

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.ticks = function(_) {
    if (!arguments.length) return ticks;
    ticks = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.axisLabel = function(_) {
    if (!arguments.length) return axisLabelText;
    axisLabelText = _;
    return chart;
  }

  chart.showMaxMin = function(_) {
    if (!arguments.length) return showMaxMin;
    showMaxMin = _;
    return chart;
  }

  chart.highlightZero = function(_) {
    if (!arguments.length) return highlightZero;
    highlightZero = _;
    return chart;
  }

  chart.scale = function(_) {
    if (!arguments.length) return scale;
    scale = _;
    axis.scale(scale);
    isOrdinal = typeof scale.rangeBands === 'function';
    d3.rebind(chart, scale, 'domain', 'range', 'rangeBand', 'rangeBands');
    return chart;
  }

  chart.rotateYLabel = function(_) {
    if(!arguments.length) return rotateYLabel;
    rotateYLabel = _;
    return chart;
  }

  chart.rotateLabels = function(_) {
    if(!arguments.length) return rotateLabels;
    rotateLabels = _;
    return chart;
  }

  chart.staggerLabels = function(_) {
    if (!arguments.length) return staggerLabels;
    staggerLabels = _;
    return chart;
  };


  //============================================================


  return chart;
}
nv.models.legend = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 5, right: 0, bottom: 5, left: 0}
    , width = 400
    , height = 20
    , getKey = function(d) { return d.key }
    , color = nv.utils.defaultColor()
    , align = true
    , dispatch = d3.dispatch('legendClick', 'legendDblclick', 'legendMouseover', 'legendMouseout')
    ;

  //============================================================


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          container = d3.select(this);


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-legend').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-legend').append('g');
      var g = wrap.select('g');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------


      var series = g.selectAll('.nv-series')
          .data(function(d) { return d });
      var seriesEnter = series.enter().append('g').attr('class', 'nv-series')
          .on('mouseover', function(d,i) {
            dispatch.legendMouseover(d,i);  //TODO: Make consistent with other event objects
          })
          .on('mouseout', function(d,i) {
            dispatch.legendMouseout(d,i);
          })
          .on('click', function(d,i) {
            dispatch.legendClick(d,i);
          })
          .on('dblclick', function(d,i) {
            dispatch.legendDblclick(d,i);
          });
      seriesEnter.append('circle')
          .style('stroke-width', 2)
          .attr('r', 5);
      seriesEnter.append('text')
          .attr('text-anchor', 'start')
          .attr('dy', '.32em')
          .attr('dx', '8');
      series.classed('disabled', function(d) { return d.disabled });
      series.exit().remove();
      series.select('circle')
          .style('fill', function(d,i) { return d.color || color(d,i)})
          .style('stroke', function(d,i) { return d.color || color(d, i) });
      series.select('text').text(getKey);


      //TODO: implement fixed-width and max-width options (max-width is especially useful with the align option)

      // NEW ALIGNING CODE, TODO: clean up
      if (align) {

        var seriesWidths = [];
        series.each(function(d,i) {
              var legendText = d3.select(this).select('text');
              var svgComputedTextLength = legendText.node().getComputedTextLength() 
                                         || nv.utils.calcApproxTextWidth(legendText);
              seriesWidths.push(svgComputedTextLength + 28); // 28 is ~ the width of the circle plus some padding
            });

        //nv.log('Series Widths: ', JSON.stringify(seriesWidths));

        var seriesPerRow = 0;
        var legendWidth = 0;
        var columnWidths = [];

        while ( legendWidth < availableWidth && seriesPerRow < seriesWidths.length) {
          columnWidths[seriesPerRow] = seriesWidths[seriesPerRow];
          legendWidth += seriesWidths[seriesPerRow++];
        }


        while ( legendWidth > availableWidth && seriesPerRow > 1 ) {
          columnWidths = [];
          seriesPerRow--;

          for (k = 0; k < seriesWidths.length; k++) {
            if (seriesWidths[k] > (columnWidths[k % seriesPerRow] || 0) )
              columnWidths[k % seriesPerRow] = seriesWidths[k];
          }

          legendWidth = columnWidths.reduce(function(prev, cur, index, array) {
                          return prev + cur;
                        });
        }
        //console.log(columnWidths, legendWidth, seriesPerRow);

        var xPositions = [];
        for (var i = 0, curX = 0; i < seriesPerRow; i++) {
            xPositions[i] = curX;
            curX += columnWidths[i];
        }

        series
            .attr('transform', function(d, i) {
              return 'translate(' + xPositions[i % seriesPerRow] + ',' + (5 + Math.floor(i / seriesPerRow) * 20) + ')';
            });

        //position legend as far right as possible within the total width
        g.attr('transform', 'translate(' + (width - margin.right - legendWidth) + ',' + margin.top + ')');

        height = margin.top + margin.bottom + (Math.ceil(seriesWidths.length / seriesPerRow) * 20);

      } else {

        var ypos = 5,
            newxpos = 5,
            maxwidth = 0,
            xpos;
        series
            .attr('transform', function(d, i) {
              var length = d3.select(this).select('text').node().getComputedTextLength() + 28;
              xpos = newxpos;

              if (width < margin.left + margin.right + xpos + length) {
                newxpos = xpos = 5;
                ypos += 20;
              }

              newxpos += length;
              if (newxpos > maxwidth) maxwidth = newxpos;

              return 'translate(' + xpos + ',' + ypos + ')';
            });

        //position legend as far right as possible within the total width
        g.attr('transform', 'translate(' + (width - margin.right - maxwidth) + ',' + margin.top + ')');

        height = margin.top + margin.bottom + ypos + 15;

      }

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.key = function(_) {
    if (!arguments.length) return getKey;
    getKey = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    return chart;
  };

  chart.align = function(_) {
    if (!arguments.length) return align;
    align = _;
    return chart;
  };

  //============================================================


  return chart;
}

nv.models.multiBar = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0}
    , width = 960
    , height = 500
    , x = d3.scale.ordinal()
    , y = d3.scale.linear()
    , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
    , getX = function(d) { return d.x }
    , getY = function(d) { return d.y }
    , forceY = [0] // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
    , clipEdge = true
    , stacked = false
    , color = nv.utils.defaultColor()
    , hideable = false
    , barColor = null // adding the ability to set the color for each rather than the whole group
    , disabled // used in conjunction with barColor to communicate from multiBarHorizontalChart what series are disabled
    , delay = 0 //1200
    , drawTime = 0 //500
    , xDomain
    , yDomain
    , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout')
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var x0, y0 //used to store previous scales
      ;

  //============================================================


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      if(hideable && data.length) hideable = [{
        values: data[0].values.map(function(d) {
        return {
          x: d.x,
          y: 0,
          series: d.series,
          size: 0.01
        };}
      )}];

      if (stacked)
        data = d3.layout.stack()
                 .offset('zero')
                 .values(function(d){ return d.values })
                 .y(getY)
                 (!data.length && hideable ? hideable : data);


      //add series index to each data point for reference
      data = data.map(function(series, i) {
        series.values = series.values.map(function(point) {
          point.series = i;
          return point;
        });
        return series;
      });


      //------------------------------------------------------------
      // HACK for negative value stacking
      if (stacked)
        data[0].values.map(function(d,i) {
          var posBase = 0, negBase = 0;
          data.map(function(d) {
            var f = d.values[i]
            f.size = Math.abs(f.y);
            if (f.y<0)  {
              f.y1 = negBase;
              negBase = negBase - f.size;
            } else
            { 
              f.y1 = f.size + posBase;
              posBase = posBase + f.size;
            }
          });
        });

      //------------------------------------------------------------
      // Setup Scales

      // remap and flatten the data for use in calculating the scales' domains
      var seriesData = (xDomain && yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
            data.map(function(d) {
              return d.values.map(function(d,i) {
                return { x: getX(d,i), y: getY(d,i), y0: d.y0, y1: d.y1 }
              })
            });

      x   .domain(d3.merge(seriesData).map(function(d) { return d.x }))
          .rangeBands([0, availableWidth], .1);

      //y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y + (stacked ? d.y1 : 0) }).concat(forceY)))
      y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return stacked ? (d.y > 0 ? d.y1 : d.y1 + d.y ) : d.y }).concat(forceY)))
          .range([availableHeight, 0]);

      // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
      if (x.domain()[0] === x.domain()[1] || y.domain()[0] === y.domain()[1]) singlePoint = true;
      if (x.domain()[0] === x.domain()[1])
        x.domain()[0] ?
            x.domain([x.domain()[0] - x.domain()[0] * 0.01, x.domain()[1] + x.domain()[1] * 0.01])
          : x.domain([-1,1]);

      if (y.domain()[0] === y.domain()[1])
        y.domain()[0] ?
            y.domain([y.domain()[0] + y.domain()[0] * 0.01, y.domain()[1] - y.domain()[1] * 0.01])
          : y.domain([-1,1]);


      x0 = x0 || x;
      y0 = y0 || y;

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-multibar').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-multibar');
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g')

      gEnter.append('g').attr('class', 'nv-groups');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------



      defsEnter.append('clipPath')
          .attr('id', 'nv-edge-clip-' + id)
        .append('rect');
      wrap.select('#nv-edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      g   .attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + id + ')' : '');



      var groups = wrap.select('.nv-groups').selectAll('.nv-group')
          .data(function(d) { return d }, function(d) { return d.key });
      groups.enter().append('g')
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6);


      groups.exit()
        .selectAll('rect.nv-bar')
        .transition()
        .delay(function(d,i) { return i * delay/ data[0].values.length })
          .attr('y', function(d) { return stacked ? y0(d.y0) : y0(0) })
          .attr('height', 0)
          .remove();
      groups
          .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
          .classed('hover', function(d) { return d.hover })
          .style('fill', function(d,i){ return color(d, i) })
          .style('stroke', function(d,i){ return color(d, i) });
      d3.transition(groups)
          .style('stroke-opacity', 1)
          .style('fill-opacity', .75);


      var bars = groups.selectAll('rect.nv-bar')
          .data(function(d) { return (hideable && !data.length) ? hideable.values : d.values });

      bars.exit().remove();


      var barsEnter = bars.enter().append('rect')
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive'})
          .attr('x', function(d,i,j) {
              return stacked ? 0 : (j * x.rangeBand() / data.length )
          })
          .attr('y', function(d) { return y0(stacked ? d.y0 : 0) })
          .attr('height', 0)
          .attr('width', x.rangeBand() / (stacked ? 1 : data.length) );
      bars
          .style('fill', function(d,i,j){ return color(d, j, i);  })
          .style('stroke', function(d,i,j){ return color(d, j, i); })
          .on('mouseover', function(d,i) { //TODO: figure out why j works above, but not here
            d3.select(this).classed('hover', true);
            dispatch.elementMouseover({
              value: getY(d,i),
              point: d,
              series: data[d.series],
              pos: [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
              pointIndex: i,
              seriesIndex: d.series,
              e: d3.event
            });
          })
          .on('mouseout', function(d,i) {
            d3.select(this).classed('hover', false);
            dispatch.elementMouseout({
              value: getY(d,i),
              point: d,
              series: data[d.series],
              pointIndex: i,
              seriesIndex: d.series,
              e: d3.event
            });
          })
          .on('click', function(d,i) {
            dispatch.elementClick({
              value: getY(d,i),
              point: d,
              series: data[d.series],
              pos: [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
              pointIndex: i,
              seriesIndex: d.series,
              e: d3.event
            });
            d3.event.stopPropagation();
          })
          .on('dblclick', function(d,i) {
            dispatch.elementDblClick({
              value: getY(d,i),
              point: d,
              series: data[d.series],
              pos: [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
              pointIndex: i,
              seriesIndex: d.series,
              e: d3.event
            });
            d3.event.stopPropagation();
          });
      bars
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive'})
          .attr('transform', function(d,i) { return 'translate(' + x(getX(d,i)) + ',0)'; })

      if (barColor) {
        if (!disabled) disabled = data.map(function() { return true });
        bars
          //.style('fill', barColor)
          //.style('stroke', barColor)
          //.style('fill', function(d,i,j) { return d3.rgb(barColor(d,i)).darker(j).toString(); })
          //.style('stroke', function(d,i,j) { return d3.rgb(barColor(d,i)).darker(j).toString(); })
          .style('fill', function(d,i,j) { return d3.rgb(barColor(d,i)).darker(  disabled.map(function(d,i) { return i }).filter(function(d,i){ return !disabled[i]  })[j]   ).toString(); })
          .style('stroke', function(d,i,j) { return d3.rgb(barColor(d,i)).darker(  disabled.map(function(d,i) { return i }).filter(function(d,i){ return !disabled[i]  })[j]   ).toString(); });
      }


      if (stacked)
            bars.transition()
          
            .delay(function(d,i) { return i * delay / data[0].values.length })
            .attr('y', function(d,i) {

              return y((stacked ? d.y1 : 0));
            })
            .attr('height', function(d,i) {
              return Math.max(Math.abs(y(d.y + (stacked ? d.y0 : 0)) - y((stacked ? d.y0 : 0))),1);
            })
            .each('end', function() {
              d3.select(this).transition().duration(drawTime)
                .attr('x', function(d,i) {
                  return stacked ? 0 : (d.series * x.rangeBand() / data.length )
                })
                .attr('width', x.rangeBand() / (stacked ? 1 : data.length) );
            })
      else
        d3.transition(bars).duration(drawTime)
          .delay(function(d,i) { return i * delay/ data[0].values.length })
            .attr('x', function(d,i) {
              return d.series * x.rangeBand() / data.length
            })
            .attr('width', x.rangeBand() / data.length)
            .each('end', function() {
              d3.select(this).transition().duration(drawTime)
                .attr('y', function(d,i) {
                  return getY(d,i) < 0 ?
                          y(0) :
                          y(0) - y(getY(d,i)) < 1 ?
                            y(0) - 1 :
                          y(getY(d,i)) || 0;
              })
              .attr('height', function(d,i) {
                  return Math.max(Math.abs(y(getY(d,i)) - y(0)),1) || 0;
                });
            })


      //store old scales for use in transitions on update
      x0 = x.copy();
      y0 = y.copy();

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.xScale = function(_) {
    if (!arguments.length) return x;
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) return y;
    y = _;
    return chart;
  };

  chart.xDomain = function(_) {
    if (!arguments.length) return xDomain;
    xDomain = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) return yDomain;
    yDomain = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) return forceY;
    forceY = _;
    return chart;
  };

  chart.stacked = function(_) {
    if (!arguments.length) return stacked;
    stacked = _;
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) return clipEdge;
    clipEdge = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    return chart;
  };

  chart.barColor = function(_) {
    if (!arguments.length) return barColor;
    barColor = nv.utils.getColor(_);
    return chart;
  };

  chart.disabled = function(_) {
    if (!arguments.length) return disabled;
    disabled = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.hideable = function(_) {
    if (!arguments.length) return hideable;
    hideable = _;
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) return delay;
    delay = _;
    return chart;
  };

  chart.drawTime = function(_) {
    if (!arguments.length) return drawTime;
    drawTime = _;
    return chart;
  };

  //============================================================


  return chart;
}

nv.models.multiBarChart = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var multibar = nv.models.multiBar()
    , xAxis = nv.models.axis()
    , yAxis = nv.models.axis()
    , legend = nv.models.legend()
    , controls = nv.models.legend()
    ;

  var margin = {top: 30, right: 20, bottom: 50, left: 60}
    , width = null
    , height = null
    , color = nv.utils.defaultColor()
    , showControls = true
    , showLegend = true
    , reduceXTicks = true // if false a tick will show for every data point
    , staggerLabels = false
    , rotateLabels = 0
    , tooltips = true
    , tooltip = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' on ' + x + '</p>'
      }
    , x //can be accessed via chart.xScale()
    , y //can be accessed via chart.yScale()
    , state = { stacked: false }
    , defaultState = null
    , noData = "No Data Available."
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState')
    , controlWidth = function() { return showControls ? 180 : 0 }
    ;

  multibar
    .stacked(false)
    .drawTime(0)
    ;
  xAxis
    .orient('bottom')
    .tickPadding(7)
    .highlightZero(true)
    .showMaxMin(false)
    .tickFormat(function(d) { return d })
    ;
  yAxis
    .orient('left')
    .tickFormat(d3.format(',.1f'))
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(multibar.x()(e.point, e.pointIndex)),
        y = yAxis.tickFormat()(multibar.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
  };

  //============================================================


  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;

      chart.update = function() { container.transition().call(chart) };
      chart.container = this;

      //set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled });

      if (!defaultState) {
        var key;
        defaultState = {};
        for (key in state) {
          if (state[key] instanceof Array)
            defaultState[key] = state[key].slice(0);
          else
            defaultState[key] = state[key];
        }
      }
      //------------------------------------------------------------
      // Display noData message if there's nothing to show.

      if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
        var noDataText = container.selectAll('.nv-noData').data([noData]);

        noDataText.enter().append('text')
          .attr('class', 'nvd3 nv-noData')
          .attr('dy', '-.7em')
          .style('text-anchor', 'middle');

        noDataText
          .attr('x', margin.left + availableWidth / 2)
          .attr('y', margin.top + availableHeight / 2)
          .text(function(d) { return d });

        return chart;
      } else {
        container.selectAll('.nv-noData').remove();
      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Scales

      x = multibar.xScale();
      y = multibar.yScale();

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-multiBarWithLegend').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-multiBarWithLegend').append('g');
      var g = wrap.select('g');

      gEnter.append('g').attr('class', 'nv-x nv-axis');
      gEnter.append('g').attr('class', 'nv-y nv-axis');
      gEnter.append('g').attr('class', 'nv-barsWrap');
      gEnter.append('g').attr('class', 'nv-legendWrap');
      gEnter.append('g').attr('class', 'nv-controlsWrap');

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Legend

      if (showLegend) {
        legend.width(availableWidth - controlWidth());

        if (multibar.barColor())
          data.forEach(function(series,i) {
            series.color = d3.rgb('#ccc').darker(i * 1.5).toString();
          })

        g.select('.nv-legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        g.select('.nv-legendWrap')
            .attr('transform', 'translate(' + controlWidth() + ',' + (-margin.top) +')');
      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Controls

      if (showControls) {
        var controlsData = [
          { key: 'Grouped', disabled: multibar.stacked() },
          { key: 'Stacked', disabled: !multibar.stacked() }
        ];

        controls.width(controlWidth()).color(['#444', '#444', '#444']);
        g.select('.nv-controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-margin.top) +')')
            .call(controls);
      }

      //------------------------------------------------------------


      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      //------------------------------------------------------------
      // Main Chart Component(s)

      multibar
        .disabled(data.map(function(series) { return series.disabled }))
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color(d, i);
        }).filter(function(d,i) { return !data[i].disabled }))


      var barsWrap = g.select('.nv-barsWrap')
          .datum(data.filter(function(d) { return !d.disabled }))

      d3.transition(barsWrap).call(multibar);

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Axes

      xAxis
        .scale(x)
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.nv-x.nv-axis'))
          .call(xAxis);

      var xTicks = g.select('.nv-x.nv-axis > g').selectAll('g');

      xTicks
          .selectAll('line, text')
          .style('opacity', 1)

      if (staggerLabels) {
          var getTranslate = function(x,y) {
              return "translate(" + x + "," + y + ")";
          };

          var staggerUp = 5, staggerDown = 17;  //pixels to stagger by
          // Issue #140
          xTicks
            .selectAll("text")
            .attr('transform', function(d,i,j) { 
                return  getTranslate(0, (j % 2 == 0 ? staggerUp : staggerDown));
              });

          var totalInBetweenTicks = d3.selectAll(".nv-x.nv-axis .nv-wrap g g text")[0].length;
          g.selectAll(".nv-x.nv-axis .nv-axisMaxMin text")
            .attr("transform", function(d,i) {
                return getTranslate(0, (i === 0 || totalInBetweenTicks % 2 !== 0) ? staggerDown : staggerUp);
            });
      }


      if (reduceXTicks)
        xTicks
          .filter(function(d,i) {
              return i % Math.ceil(data[0].values.length / (availableWidth / 100)) !== 0;
            })
          .selectAll('text, line')
          .style('opacity', 0);

      if(rotateLabels)
        xTicks
          .selectAll('text')
          .attr('transform', 'rotate(' + rotateLabels + ' 0,0)')
          .attr('text-anchor', rotateLabels > 0 ? 'start' : 'end');
      
      g.select('.nv-x.nv-axis').selectAll('g.nv-axisMaxMin text')
          .style('opacity', 1);

      yAxis
        .scale(y)
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.nv-y.nv-axis'))
          .call(yAxis);

      //------------------------------------------------------------



      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('legendClick', function(d,i) {
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.nv-series').classed('disabled', false);
            return d;
          });
        }

        state.disabled = data.map(function(d) { return !!d.disabled });
        dispatch.stateChange(state);

        chart.update();
      });

      legend.dispatch.on('legendDblclick', function(d) {
          //Double clicking should always enable current series, and disabled all others.
          data.forEach(function(d) {
             d.disabled = true;
          });
          d.disabled = false;  

          state.disabled = data.map(function(d) { return !!d.disabled });
          dispatch.stateChange(state);
          chart.update();
      });


      controls.dispatch.on('legendClick', function(d,i) {
        if (!d.disabled) return;
        controlsData = controlsData.map(function(s) {
          s.disabled = true;
          return s;
        });
        d.disabled = false;

        switch (d.key) {
          case 'Grouped':
            multibar.stacked(false);
            break;
          case 'Stacked':
            multibar.stacked(true);
            break;
        }

        state.stacked = multibar.stacked();
        dispatch.stateChange(state);

        chart.update();
      });

      dispatch.on('tooltipShow', function(e) {
        if (tooltips) showTooltip(e, that.parentNode)
      });

      // Update chart from a state object passed to event handler
      dispatch.on('changeState', function(e) {

        if (typeof e.disabled !== 'undefined') {
          data.forEach(function(series,i) {
            series.disabled = e.disabled[i];
          });

          state.disabled = e.disabled;
        }

        if (typeof e.stacked !== 'undefined') {
          multibar.stacked(e.stacked);
          state.stacked = e.stacked;
        }

        chart.update();
      });

      //============================================================


    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  multibar.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });

  multibar.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });
  dispatch.on('tooltipHide', function() {
    if (tooltips) nv.tooltip.cleanup();
  });

  //============================================================


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.multibar = multibar;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, multibar, 'x', 'y', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'id', 'stacked', 'delay', 'barColor');

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    return chart;
  };

  chart.showControls = function(_) {
    if (!arguments.length) return showControls;
    showControls = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return showLegend;
    showLegend = _;
    return chart;
  };

  chart.reduceXTicks= function(_) {
    if (!arguments.length) return reduceXTicks;
    reduceXTicks = _;
    return chart;
  };

  chart.rotateLabels = function(_) {
    if (!arguments.length) return rotateLabels;
    rotateLabels = _;
    return chart;
  }

  chart.staggerLabels = function(_) {
    if (!arguments.length) return staggerLabels;
    staggerLabels = _;
    return chart;
  };

  chart.tooltip = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) return tooltips;
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.state = function(_) {
    if (!arguments.length) return state;
    state = _;
    return chart;
  };

  chart.defaultState = function(_) {
    if (!arguments.length) return defaultState;
    defaultState = _;
    return chart;
  };
  
  chart.noData = function(_) {
    if (!arguments.length) return noData;
    noData = _;
    return chart;
  };

  //============================================================


  return chart;
}
})();