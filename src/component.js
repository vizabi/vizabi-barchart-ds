const {
  utils,
  Component,
  helpers: {
    "d3.axisWithLabelPicker": axisSmart
  },
  iconset: {
    question: iconQuestion
  },
} = Vizabi;

// POP BY AGE CHART COMPONENT
const BarChartDS = Component.extend("barchartds", {

  /**
   * Initializes the component (Bar Chart).
   * Executed once before any template is rendered.
   * @param {Object} config The config passed to the component
   * @param {Object} context The component's parent
   */
  init(config, context) {
    this.name = "barchartds";
    this.template = require("./template.html");

    //define expected models for this component
    this.model_expects = [{
      name: "time",
      type: "time"
    }, {
      name: "marker",
      type: "model"
    }, {
      name: "marker_order",
      type: "model"
    }, {
      name: "entities",
      type: "entities"
    }, {
      name: "entities_side",
      type: "entities"
    }, {
      name: "entities_allpossible",
      type: "entities"
    }, {
      name: "entities_geodomain",
      type: "entities"
    }, {
      name: "locale",
      type: "locale"
    }, {
      name: "ui",
      type: "ui"
    }];

    const _this = this;
    this.model_binds = {
      "change:time.value": function(evt) {
        if (!_this._readyOnce) return;
        if (_this.model.time.step != 1 && !_this.snapped && !_this.model.time.playing && !_this.model.time.dragging) {
          let next = d3.bisectLeft(_this.timeSteps, _this.model.time.value);
          if (next != 0 && (_this.timeSteps[next] - _this.model.time.value)) {
            _this.snapped = true;
            const time = _this.model.time.value;
            const prev = _this.timeSteps[next - 1];
            next = _this.timeSteps[next];
            const snapTime = (time - prev) < (next - time) ? prev : next;
            _this.model.time.value = new Date(snapTime);
          }
        }
        if (!_this.snapped) {
//          if (_this.timeSteps.filter(t => (t - _this.model.time.value) == 0).length) {
            _this.model.marker.getFrame(_this.model.time.value, frame => {
              _this.frame = frame;
              _this.frameAxisX = frame.axis_x;
              _this.model.marker_order.getFrame(_this.model.time.value, frameOrder => {
                _this.frameOrder = frameOrder.hook_order;

                _this._reorderBars();
                _this._updateEntities(true);
                _this.updateBarsOpacity();
              });
            });
          // } else {
          //   const nextIndex = d3.bisectLeft(_this.timeSteps, _this.model.time.value);
          //   const prevFrameTime = _this.timeSteps[nextIndex - 1];
          //   const nextFrameTime = _this.timeSteps[nextIndex];
          //   const fraction = (_this.model.time.value - prevFrameTime) / (nextFrameTime - prevFrameTime);
          //   _this.model.marker.getFrame(nextFrameTime, nValues => {
          //     _this.model.marker.getFrame(prevFrameTime, pValues => {
          //       _this.frameAxisX = _this.interpolateDiagonal(pValues.axis_x, nValues.axis_x, fraction);
          //       _this._updateEntities();
          //       _this.updateBarsOpacity();
          //     });
          //   });
          // }
        }
        _this.snapped = false;
      },
      "change:marker": function(evt, path) {
        if (!_this._readyOnce) return;
        if (path.indexOf("scaleType") > -1) {
          _this.ready();
          return;
        }
      },
      "change:marker.select": function(evt) {
        _this.someSelected = (_this.model.marker.select.length > 0);
        _this.nonSelectedOpacityZero = false;
        _this.updateBarsOpacity();
      },
      "change:marker.highlight": function(evt, path) {
        if (!_this._readyOnce) return;
        _this._highlightBars();
      },
      "change:marker.opacitySelectDim": function() {
        _this.updateBarsOpacity();
      },
      "change:marker.opacityRegular": function() {
        _this.updateBarsOpacity();
      },
      "change:marker.color.palette": function(evt) {
        if (!_this._readyOnce) return;
        _this._updateEntities();
      },
      "change:marker.color.scaleType": function(evt) {
        if (!_this._readyOnce) return;
        _this._updateEntities();
      },
      "change:marker.color.which": function(evt) {
        if (!_this._readyOnce) return;
        let stackDim;
        const show = {};
        if (_this.model.marker.color.use == "constant") {
          stackDim = null;
        } else {
          const colorConcept = _this.model.marker.color.getConceptprops();
          if (colorConcept.concept_type == "entity_set") {
            stackDim = colorConcept.domain;
            show["is--" + _this.model.marker.color.which] = true;
            const sideConcept = _this.model.marker.side.getConceptprops();
            if (sideConcept.concept_type == "entity_set" && stackDim == sideConcept.domain && _this.model.marker.side.which !== _this.model.marker.color.which) {
              _this.model.marker.side.setWhich({"concept" : _this.model.marker.color.which});
            }          
          } else {
            stackDim = _this.model.marker.color.which;
          }
        }
        _this.model.entities_geodomain.skipFilter = stackDim === _this.geoDomainDimension || _this.SIDEDIM === _this.geoDomainDimension;
        _this.model.entities.set("show", show);
        _this.model.entities.set("dim", stackDim);
        _this.model.entities_allpossible.set("dim", _this.model.marker.color.which);
      },
      "change:marker.side.which": function(evt) {
        if (!_this._readyOnce) return;
        let sideDim;
        if (_this.model.marker.side.use == "constant") {
          sideDim = null;
        } else {
          const sideConcept = _this.model.marker.side.getConceptprops();
          if (sideConcept.concept_type == "entity_set") {
            sideDim = sideConcept.domain;
            const colorConcept = _this.model.marker.color.getConceptprops();
            if (colorConcept.concept_type == "entity_set" && sideDim == colorConcept.domain && _this.model.marker.color.which !== _this.model.marker.side.which) {
              _this.model.marker.color.setWhich({"concept" : _this.model.marker.side.which});
            }          
          } else {
            sideDim = _this.model.marker.side.which;
          }
        } 
//        const sideDim = _this.model.marker.side.use == "constant" ? null : _this.model.marker.side.which;
        _this.model.entities_geodomain.skipFilter = sideDim === _this.geoDomainDimension || _this.STACKDIM === _this.geoDomainDimension;
        _this.model.marker.side.clearSideState();
        _this.model.entities_side.clearShow();
        _this.model.entities_side.set("dim", sideDim);
      },
      "change:entities.show": function(evt) {
        if (!_this._readyOnce) return;
        if (_this.model.entities.dim === _this.model.entities_side.dim
          && !utils.isEmpty(_this.model.entities.show)
          && _this.model.entities.show[_this.model.entities.dim]
          && !utils.isEmpty(_this.model.entities_side.show)) {
          utils.forEach(_this.model.entities_side.getFilteredEntities(), s => {
            if (!_this.model.entities.isShown(s)) {
              _this.model.marker.side.clearSideState();
              _this.model.entities_side.showEntity(s);
            }
          });
        }
      },
      "change:entities_side.show": function(evt) {
        if (!_this._readyOnce) return;

        let doReturn = false;
        let _entitiesSameDimWithSide = null;
        utils.forEach(_this.model.marker.side._space, h => {
          if (h.dim === _this.model.entities_side.dim && h._name !== _this.model.entities_side._name && h._name !== _this.model.entities_geodomain._name) {
            _entitiesSameDimWithSide = h;
          }
        });
        if (_entitiesSameDimWithSide && !utils.isEmpty(_entitiesSameDimWithSide.show) && _entitiesSameDimWithSide.show[_entitiesSameDimWithSide.dim]) {
          utils.forEach(_this.model.entities_side.getFilteredEntities(), s => {
            if (!_entitiesSameDimWithSide.isShown(s)) {
              _entitiesSameDimWithSide.showEntity(s);
              doReturn = true;
            }
          });
        }
        if (doReturn) return;

        _this._updateIndicators();
        if (!_this.model.ready || !_this.frame) return;
        _this._updateLimits();
        _this.resize();
        _this._updateEntities();
      },
      "change:ui.chart.inpercent": function(evt) {
        if (!_this._readyOnce) return;
        _this._updateLimits();
        _this.resize();
        _this._updateEntities();
      },
      "change:ui.chart.flipSides": function(evt) {
        if (!_this._readyOnce) return;
        _this.model.marker.side.switchSideState();
        _this._updateIndicators();
        _this.resize();
        _this._updateEntities();
      }
    };

    //contructor is the same as any component
    this._super(config, context);

    this.xScale = null;
    this.yScale = null;
    this.cScale = null;

    this.xAxis = axisSmart("bottom");
    this.xAxisLeft = axisSmart("bottom");
    this.yAxis = axisSmart("left");
    this.xScales = [];
    //this.SHIFTEDAGEDIM = "s_age";

    this.totalFieldName = "Total";
  },

  // afterPreload: function() {
  //   var obj = {};
  //   obj["which"] = this.model.marker.axis_x.which;
  //   obj["use"] = this.model.marker.axis_x.use;
  //   this.model.marker_side.hook_total.set(obj);
  // },

  checkDimensions() {
    const stackDim = this.model.entities.dim;
    const sideDim = this.model.entities_side.dim;

    this.colorUseNotProperty = this.model.marker.color.use == "constant" || this.model.marker.color.use == "indicator";
    this.stackSkip = this.colorUseNotProperty || stackDim == sideDim;
    this.geoLess = stackDim !== this.geoDomainDimension && sideDim !== this.geoDomainDimension && this.AGEDIM !== this.geoDomainDimension;
    this.sideSkip = this.model.marker.side.use == "constant";
  },

  /**
   * DOM is ready
   */
  readyOnce() {
    const _this = this;
    this.el = (this.el) ? this.el : d3.select(this.element);
    this.element = this.el;

    this.interaction = this._interaction();

    this.graph = this.element.select(".vzb-bc-graph");
    this.yAxisEl = this.graph.select(".vzb-bc-axis-y");
    this.xAxisEl = this.graph.select(".vzb-bc-axis-x");
    this.xAxisLeftEl = this.graph.select(".vzb-bc-axis-x-left");
    this.xTitleEl = this.element.select(".vzb-bc-axis-x-title");
    this.xInfoEl = this.element.select(".vzb-bc-axis-x-info");
    this.yTitleEl = this.graph.select(".vzb-bc-axis-y-title");
    this.barsCrop = this.graph.select(".vzb-bc-bars-crop");
    this.labelsCrop = this.graph.select(".vzb-bc-labels-crop");
    this.bars = this.graph.select(".vzb-bc-bars");
    this.labels = this.graph.select(".vzb-bc-labels");
    this.labels.select(".vzb-bc-age").attr("y", -10);

    this.title = this.element.select(".vzb-bc-title");
    this.titleRight = this.element.select(".vzb-bc-title-right");
    this.year = this.element.select(".vzb-bc-year");

    this.geoDomainDimension = this.model.entities_geodomain.getDimension();
    this.geoDomainDefaultValue = this.model.entities_geodomain.show[this.geoDomainDimension]["$in"][0];

    _this.someSelected = (_this.model.marker.select.length > 0);
    _this.nonSelectedOpacityZero = false;


    this.on("resize", () => {
      _this._updateEntities();
  });

    this._attributeUpdaters = {
      _newWidth(d, i) {
        d["x_"] = 0;
        let width;
        if (_this.geoLess && _this.stackSkip && _this.sideSkip) {
          width = (_this.frameAxisX[d[_this.AGEDIM]] || {})[_this.geoDomainDefaultValue];
        } else if (_this.geoLess && _this.stackSkip) {
          width = _this.colorUseNotProperty || d[_this.PREFIXEDSIDEDIM] == d[_this.PREFIXEDSTACKDIM] ? (_this.frameAxisX[d[_this.PREFIXEDSIDEDIM]][d[_this.AGEDIM]] || {})[_this.geoDomainDefaultValue] : 0;
        } else if (_this.geoLess && _this.sideSkip) {
          width = (_this.frameAxisX[d[_this.PREFIXEDSTACKDIM]][d[_this.AGEDIM]] || {})[_this.geoDomainDefaultValue];
        } else if (_this.stackSkip) {
          width = _this.colorUseNotProperty || d[_this.PREFIXEDSIDEDIM] == d[_this.PREFIXEDSTACKDIM] ? _this.frameAxisX[d[_this.PREFIXEDSIDEDIM]][d[_this.AGEDIM]] : 0;
        } else if (_this.sideSkip) {
          width = _this.frameAxisX[d[_this.PREFIXEDSTACKDIM]][d[_this.AGEDIM]];
        } else {
          width = _this.frameAxisX[d[_this.PREFIXEDSTACKDIM]][d[_this.PREFIXEDSIDEDIM]][d[_this.AGEDIM]];
        }
        d["width_"] = width ? _this.xScale(width) : 0;
        if (_this.ui.chart.inpercent) {
          d["width_"] /= _this.total[d[_this.PREFIXEDSIDEDIM]];
        }
        return d.width_;
      },
      _newX(d, i) {
        const prevSbl = this.previousSibling;
        if (prevSbl) {
          const prevSblDatum = d3.select(prevSbl).datum();
          d["x_"] = prevSblDatum.x_ + prevSblDatum.width_;
        } else {
          d["x_"] = 0;
        }
        return d.x_;
      }
    };
  },

  /*
   * Both model and DOM are ready
   */
  ready() {
    //TODO: get component ready if some submodel doesn't ready ??????
    if (!this.model.marker._ready) return;

    const _this = this;

    this.timeSteps = this.model.time.getAllSteps();

    this.shiftScale = d3.scale.linear()
      .domain([this.timeSteps[0], this.timeSteps[this.timeSteps.length - 1]])
      .range([0, this.timeSteps.length - 1]);

    this.KEYS = utils.unique(this.model.marker._getAllDimensions({ exceptType: "time" }));
    this.side = this.model.marker.label_side.getEntity();
    this.SIDEDIM = this.side.getDimension();
    this.PREFIXEDSIDEDIM = "side_" + this.SIDEDIM;
    this.stack = this.model.marker.label_stack.getEntity();
    this.STACKDIM = this.stack.getDimension() || this.model.marker.color.which;
    this.PREFIXEDSTACKDIM = "stack_" + this.STACKDIM;
    this.age = this.model.marker.axis_y.getEntity();
    this.AGEDIM = this.SHIFTEDAGEDIM = this.age.getDimension();
    this.TIMEDIM = this.model.time.getDimension();
    this.groupBy = this.age.grouping || 1;
    this.checkDimensions();
    this.updateUIStrings();
    this._updateIndicators();

    this.frame = null;
    this.model.marker.getFrame(_this.model.time.value, frame => {
      _this.frame = frame;
      _this.frameAxisX = frame.axis_x;
      _this.model.marker_order.getFrame(_this.model.time.value, frameOrder => {
        _this.frameOrder = frameOrder.hook_order;
        _this._createLimits();
        _this._updateLimits();
  
        _this._reorderBars();
        _this.markers = this.model.marker.getKeys(_this.AGEDIM);

        _this.resize();
        _this._updateEntities(true);
        _this.updateBarsOpacity();
      });
    });
  },

  updateUIStrings() {
    const _this = this;
    this.translator = this.model.locale.getTFunction();

    const xTitle = this.xTitleEl.selectAll("text").data([0]);
    xTitle.enter().append("text");
    xTitle
      .on("click", () => {
        _this.parent
          .findChildByName("gapminder-treemenu")
          .markerID("axis_x")
          .alignX(_this.model.locale.isRTL() ? "right" : "left")
          .alignY("top")
          .updateView()
          .toggle();
      });

    utils.setIcon(this.xInfoEl, iconQuestion)
      .select("svg").attr("width", "0px").attr("height", "0px");

    this.xInfoEl.on("click", () => {
      _this.parent.findChildByName("gapminder-datanotes").pin();
    });
    this.xInfoEl.on("mouseover", function() {
      if (_this.model.time.dragging) return;
      const rect = this.getBBox();
      const coord = utils.makeAbsoluteContext(this, this.farthestViewportElement)(rect.x - 10, rect.y + rect.height + 10);
      const toolRect = _this.root.element.getBoundingClientRect();
      const chartRect = _this.element.node().getBoundingClientRect();
      _this.parent.findChildByName("gapminder-datanotes").setHook("axis_x").show().setPos(coord.x + chartRect.left - toolRect.left, coord.y);
    });
    this.xInfoEl.on("mouseout", () => {
      if (_this.model.time.dragging) return;
    _this.parent.findChildByName("gapminder-datanotes").hide();
  });

    // var titleStringY = this.model.marker.axis_y.getConceptprops().name;

    // var yTitle = this.yTitleEl.selectAll("text").data([0]);
    // yTitle.enter().append("text");
    // yTitle
    //   .attr("y", "-6px")
    //   .attr("x", "-9px")
    //   .attr("dx", "-0.72em")
    //   .text(titleStringY);
  },

  /**
   * Changes labels for indicators
   */
  _updateIndicators() {
    const _this = this;
    this.duration = this.model.time.delayAnimations;
    this.yScale = this.model.marker.axis_y.getScale();
    this.xScale = this.model.marker.axis_x.getScale();
    this.yAxis.tickFormat(_this.model.marker.axis_y.getTickFormatter());
    this.xAxis.tickFormat(_this.model.marker.axis_x.getTickFormatter());
    this.xAxisLeft.tickFormat(_this.model.marker.axis_x.getTickFormatter());

    const sideDim = this.SIDEDIM;
    const stackDim = this.STACKDIM;
    const ageDim = this.AGEDIM;
    const groupBy = this.groupBy;

    const ages = this.model.marker.getKeys(ageDim);
    let ageKeys = [];
    ageKeys = ages.map(m => m[ageDim]);
    this.shiftedAgeKeys = this.ageKeys = ageKeys;

    //this.shiftedAgeKeys = this.timeSteps.map((m, i) => -i * groupBy).slice(1).reverse().concat(ageKeys);

    const sideItems = this.model.marker.label_side.getItems();
    //var sideKeys = Object.keys(sideItems);
    let sideKeys = [];
    if (!utils.isEmpty(sideItems)) {
      const sideFiltered = !!this.model.marker.side.getEntity().show[sideDim];
      const sides = this.model.marker.getKeys(sideDim)
          .filter(f => !sideFiltered || this.model.marker.side.getEntity().isShown(f));
      sideKeys = sides.map(m => m[sideDim]);

      if (sideKeys.length > 2) sideKeys.length = 2;
      if (sideKeys.length > 1) {
        const sortFunc = this.ui.chart.flipSides ? d3.ascending : d3.descending;
        sideKeys.sort(sortFunc);
      }
    }
    if (!sideKeys.length) sideKeys.push("undefined");
    this.sideKeys = sideKeys;

    const stacks = this.model.marker.color.use == "indicator" ? [] : this.model.marker.getKeys(stackDim);
    const stackKeys = utils.without(stacks.map(m => {
        if (m[stackDim] == _this.totalFieldName) _this.dataWithTotal = true;
        return m[stackDim];
      }), this.totalFieldName);

    let sortedStackKeys = utils.keys(this.model.marker.color.getPalette()).reduce((arr, val) => {
        if (stackKeys.indexOf(val) != -1) arr.push(val);
        return arr;
      }, []);

    if (sortedStackKeys.length != stackKeys.length) {
      sortedStackKeys = stackKeys.reduce((arr, val) => {
          if (arr.indexOf(val) == -1) arr.push(val);
          return arr;
        }, sortedStackKeys);
    }
    this.stackKeys = sortedStackKeys;
    this.stackItems = this.model.marker.label_stack.getItems();

    this.stacked = this.ui.chart.stacked && this.model.marker.color.use != "constant" && this.stack.getDimension();

    this.twoSided = this.sideKeys.length > 1;
    this.titleRight.classed("vzb-hidden", !this.twoSided);
    if (this.twoSided) {
      this.xScaleLeft = this.xScale.copy();
      this.title.text(sideItems[this.sideKeys[1]]);
      this.titleRight.text(sideItems[this.sideKeys[0]]);
    } else {
      const title = this.sideKeys.length && sideItems[this.sideKeys[0]] ? sideItems[this.sideKeys[0]] : "";
      this.title.text(title);
    }

    this.cScale = this.model.marker.color.getScale();
  },

  _reorderBars() {
    const _this = this;
    const domain = this.yScale.domain();
    const sideKeys = this.sideKeys;
    domain.sort((a, b) => { 
      const result = d3.ascending(_this.frameOrder[a] || 0, _this.frameOrder[b] || 0);
      return result !== 0 ? result : d3.ascending(_this.frameAxisX[sideKeys[0]][a] || 0, _this.frameAxisX[sideKeys[0]][b] || 0);
    });
    this.yScale.domain(domain);
  },

  _createLimits() {
    const _this = this;
    const axisX = this.model.marker.axis_x;

    //const sideKeysNF = Object.keys(this.model.marker.side.getItems());
    const sideKeysNF = Object.keys(this.model.marker.side.getNestedItems([this.SIDEDIM]));
    if (!sideKeysNF.length) sideKeysNF.push("undefined");

    const keys = this.stackSkip && this.sideSkip ? [] : (this.sideSkip ? [this.STACKDIM] : (this.stackSkip ? [this.SIDEDIM] : [this.STACKDIM, this.SIDEDIM]));
    const limits = axisX.getLimitsByDimensions(keys.concat([this.AGEDIM, this.TIMEDIM]));
    const timeKeys = axisX.getUnique();
    const totals = {};
    const inpercentMaxLimits = {};
    const maxLimits = {};
    sideKeysNF.forEach(s => {
      maxLimits[s] = [];
      inpercentMaxLimits[s] = [];
    });

    if (_this.stackSkip && _this.sideSkip) {
      utils.forEach(timeKeys, time => {
        totals[time] = {};
        let ageSum = 0;
        const sideMaxLimits = [];
        utils.forEach(_this.ageKeys, age => {
          let stackSum = 0;
          if (limits[age] && limits[age][time]) {
            stackSum += limits[age][time].max;
            ageSum += stackSum;
          }
          sideMaxLimits.push(stackSum);
        });
        totals[time][sideKeysNF[0]] = ageSum;
        const maxSideLimit = Math.max(...sideMaxLimits);
        inpercentMaxLimits[sideKeysNF[0]].push(maxSideLimit / ageSum);
        maxLimits[sideKeysNF[0]].push(maxSideLimit);
      });
    } else if (_this.sideSkip) {
      utils.forEach(timeKeys, time => {
        totals[time] = {};
        let ageSum = 0;
        const sideMaxLimits = [];
        utils.forEach(_this.ageKeys, age => {
          let stackSum = 0;
            utils.forEach(_this.stackKeys, stack => {
              if (limits[stack] && limits[stack][age] && limits[stack][age][time]) {
              stackSum += limits[stack][age][time].max;
              ageSum += stackSum;
            }
          });
          sideMaxLimits.push(stackSum);
        });
        totals[time][sideKeysNF[0]] = ageSum;
        const maxSideLimit = Math.max(...sideMaxLimits);
        inpercentMaxLimits[sideKeysNF[0]].push(maxSideLimit / ageSum);
        maxLimits[sideKeysNF[0]].push(maxSideLimit);
      });
    } else if (_this.stackSkip) {
      utils.forEach(timeKeys, time => {
        totals[time] = {};
        utils.forEach(sideKeysNF, side => {
          let ageSum = 0;
          const sideMaxLimits = [];
          utils.forEach(_this.ageKeys, age => {
            let stackSum = 0;
            if (limits[side] && limits[side][age] && limits[side][age][time]) {
              stackSum += limits[side][age][time].max;
              ageSum += stackSum;
            }
            sideMaxLimits.push(stackSum);
          });
          totals[time][side] = ageSum;
          const maxSideLimit = Math.max(...sideMaxLimits);
          inpercentMaxLimits[side].push(maxSideLimit / ageSum);
          maxLimits[side].push(maxSideLimit);
        });
      });
    } else {
      utils.forEach(timeKeys, time => {
        totals[time] = {};
        utils.forEach(sideKeysNF, side => {
          let ageSum = 0;
          const sideMaxLimits = [];
          utils.forEach(_this.ageKeys, age => {
            let stackSum = 0;
            utils.forEach(_this.stackKeys, stack => {
              if (limits[stack][side] && limits[stack][side][age] && limits[stack][side][age][time]) {
                stackSum += limits[stack][side][age][time].max;
                ageSum += stackSum;
              }
            });
            sideMaxLimits.push(stackSum);
          });
          totals[time][side] = ageSum;
          const maxSideLimit = Math.max(...sideMaxLimits);
          inpercentMaxLimits[side].push(maxSideLimit / ageSum);
          maxLimits[side].push(maxSideLimit);
        });
      });
    }

    this.maxLimits = {};
    this.inpercentMaxLimits = {};
    sideKeysNF.forEach(s => {
      _this.maxLimits[s] = Math.max(...maxLimits[s]);
      _this.inpercentMaxLimits[s] = Math.max(...inpercentMaxLimits[s]);
    });
    this.totals = totals;
  },

  _updateLimits() {
    const _this = this;
    const axisX = this.model.marker.axis_x;
    const zero = axisX.scaleType == "log" ? 0.01 : 0;
    let domain;
    if (this.ui.chart.inpercent) {
      domain = [zero * 0.01, Math.max(...this.sideKeys.map(s => _this.inpercentMaxLimits[s]))];
    } else {
      domain = (axisX.domainMin != null && axisX.domainMax != null) ? [+axisX.domainMin, +axisX.domainMax] : [zero, Math.max(...this.sideKeys.map(s => _this.maxLimits[s]))];
    }
    this.xScale.domain(domain);
    if (this.xScaleLeft) this.xScaleLeft.domain(this.xScale.domain());
  },


  _interpolateBetweenTotals(timeSteps, totals, time) {
    const nextStep = d3.bisectLeft(timeSteps, time);
    const fraction = (time - timeSteps[nextStep - 1]) / (timeSteps[nextStep] - timeSteps[nextStep - 1]);
    const total = {};
    utils.forEach(this.sideKeys, side => {
      total[side] = totals[timeSteps[nextStep]][side] * fraction + totals[timeSteps[nextStep - 1]][side] * (1 - fraction);
  });
    return total;
  },

  /**
   * Updates entities
   */
  _updateEntities(reorder) {

    const _this = this;
    const time = this.model.time;
    const sideDim = this.SIDEDIM;
    const prefixedSideDim = this.PREFIXEDSIDEDIM;
    const ageDim = this.AGEDIM;
    const stackDim = this.STACKDIM;
    const prefixedStackDim = this.PREFIXEDSTACKDIM;
    const timeDim = this.TIMEDIM;
    const duration = (time.playing) ? time.delayAnimations : 0;
    let total;

    const groupBy = this.groupBy;
    //var group_offset = this.model.marker.group_offset ? Math.abs(this.model.marker.group_offset % groupBy) : 0;

    if (this.ui.chart.inpercent) {
      this.total = this.totals[time.value] ? this.totals[time.value] : this._interpolateBetweenTotals(this.timeSteps, this.totals, time.value);
    }

    const domain = this.yScale.domain();

    //this.model.age.setVisible(markers);

    //const nextStep = d3.bisectLeft(this.timeSteps, time.value);

    const shiftedAgeDim = this.SHIFTEDAGEDIM;

  //   const markers = this.markers.map(data => {
  //       const o = {};
  //   o[ageDim] = o[shiftedAgeDim] = +data[ageDim];
  //   o[ageDim] -= nextStep * groupBy;
  //   return o;
  // });

    const ageBars = this.markers.slice(0);

    // const outAge = {};
    // outAge[shiftedAgeDim] = markers.length * groupBy;
    // outAge[ageDim] = outAge[shiftedAgeDim] - nextStep * groupBy;

   //this.ageShift = 0;//= nextStep * groupBy;

    // if (nextStep) ageBars.push(outAge);

    this.entityBars = this.bars.selectAll(".vzb-bc-bar")
        .data(ageBars, d => d[ageDim]);
    //exit selection
    this.entityBars.exit().remove();

    const oneBarHeight = this.oneBarHeight;
    const barHeight = this.barHeight;
    const firstBarOffsetY = this.firstBarOffsetY;

    //enter selection -- init bars
    this.entityBars = this.entityBars.enter().append("g")
        .attr("class", d => "vzb-bc-bar " + "vzb-bc-bar-" + d[ageDim])
//  .attr("transform", (d, i) => "translate(0," + (firstBarOffsetY - (d[shiftedAgeDim] - domain[0] - groupBy) * oneBarHeight) + ")")
  .attr("transform", (d, i) => "translate(0," + (firstBarOffsetY - _this.yScale(d[shiftedAgeDim])) + ")")
  .merge(this.entityBars);

    // this.entityBars.attr("class", function(d) {
    //     return "vzb-bc-bar " + "vzb-bc-bar-" + d[ageDim];
    //   })


    this.sideBars = this.entityBars.selectAll(".vzb-bc-side").data(d => _this.sideKeys.map(m => {
        const r = {};
    r[ageDim] = d[ageDim];
    r[shiftedAgeDim] = d[shiftedAgeDim];
    r[prefixedSideDim] = m;
    r[sideDim] = m;
    return r;
  }), d => d[prefixedSideDim]);

    this.sideBars.exit().remove();
    this.sideBars = this.sideBars.enter().append("g")
        .attr("class", (d, i) => "vzb-bc-side " + "vzb-bc-side-" + (!i != !_this.twoSided ? "right" : "left"))
    .merge(this.sideBars);

    if (reorder) {
      this.sideBars.attr("transform", (d, i) => i ? ("scale(-1,1) translate(" + _this.activeProfile.centerWidth + ",0)") : "");
    }

    const _attributeUpdaters = this._attributeUpdaters;

    this.stackBars = this.sideBars.selectAll(".vzb-bc-stack").data((d, i) => {
      const stacks = _this.stacked ? _this.stackKeys : [_this.totalFieldName];
      return stacks.map(m => {
        const r = {};
        r[ageDim] = d[ageDim];
        r[shiftedAgeDim] = d[shiftedAgeDim];
        r[sideDim] = d[sideDim];
        r[stackDim] = m;
        r[prefixedSideDim] = d[prefixedSideDim];
        r[prefixedStackDim] = m;
        return r;
      });
    }, d => d[prefixedStackDim]);

    this.stackBars.exit().remove();
    this.stackBars = this.stackBars.enter().append("rect")
      .attr("class", (d, i) => "vzb-bc-stack " + "vzb-bc-stack-" + i + (_this.highlighted ? " vzb-dimmed" : ""))
      .attr("y", 0)
      .attr("height", barHeight)
      .attr("fill", d => _this.cScale(_this.colorUseNotProperty ? _this.frame.color[d[_this.PREFIXEDSIDEDIM]][d[_this.AGEDIM]] : d[prefixedStackDim]))
      .attr("width", _attributeUpdaters._newWidth)
      .attr("x", _attributeUpdaters._newX)
      .on("mouseover", _this.interaction.mouseover)
      .on("mouseout", _this.interaction.mouseout)
      .on("click", _this.interaction.click)
      .onTap(_this.interaction.tap)
      .merge(this.stackBars);


    if (reorder) this.stackBars
      .attr("fill", d => _this.cScale(_this.colorUseNotProperty ? _this.frame.color[d[_this.PREFIXEDSIDEDIM]][d[_this.AGEDIM]] : d[prefixedStackDim]))
      .order();

    const stepShift = (ageBars[0][shiftedAgeDim] - ageBars[0][ageDim]) - this.shiftScale(time.value) * groupBy;

    if (duration) {
      const transition = d3.transition()
        .duration(duration)
        .ease(d3.easeLinear);

      this.entityBars
        //.transition(transition)
        .attr("transform", (d, i) => "translate(0," + (firstBarOffsetY - _this.yScale(d[shiftedAgeDim])) + ")");
//        .attr("transform", (d, i) => "translate(0," + (firstBarOffsetY - (d[shiftedAgeDim] - domain[0] - stepShift) * oneBarHeight) + ")");
      this.stackBars
        .transition(transition)
        .attr("width", _attributeUpdaters._newWidth)
        .attr("x", _attributeUpdaters._newX);
    } else {
      this.entityBars.interrupt()
        .attr("transform", (d, i) => "translate(0," + (firstBarOffsetY - _this.yScale(d[shiftedAgeDim])) + ")");
//        .attr("transform", (d, i) => "translate(0," + (firstBarOffsetY - (d[shiftedAgeDim] - domain[0] - stepShift) * oneBarHeight) + ")");
      this.stackBars.interrupt()
        .attr("width", _attributeUpdaters._newWidth)
        .attr("x", _attributeUpdaters._newX);
    }

    // this.entityLabels = this.labels.selectAll(".vzb-bc-label")
    //   .data(this.markers, d => d[ageDim]);
    // //exit selection
    // this.entityLabels.exit().remove();

    // const entityLabels = this.entityLabels.enter().append("g")
    //   .attr("class", "vzb-bc-label")
    //   .attr("id", d => "vzb-bc-label-" + d[shiftedAgeDim] + "-" + _this._id)
    // entityLabels.append("text")
    //   .attr("class", "vzb-bc-age")
    //   .attr("y", (d, i) => firstBarOffsetY - _this.yScale(d[shiftedAgeDim]) - 10);

    // this.entityLabels = entityLabels.merge(this.entityLabels);
    // // .style("fill", function(d) {
    // //   var color = _this.cScale(values.color[d[ageDim]]);
    // //   return d3.rgb(color).darker(2);
    // // });

    // if (reorder) this.entityLabels.selectAll(".vzb-bc-age").attr("y", (d, i) => firstBarOffsetY - _this.yScale(d[shiftedAgeDim]) - 10);

    if (duration) {
      this.year.transition().duration(duration).ease(d3.easeLinear)
        .on("end", this._setYear(time.value));
    } else {
      this.year.interrupt().text(time.formatDate(time.value)).transition();
    }
  },

  _setYear(timeValue) {
    const formattedTime = this.model.time.formatDate(timeValue);
    return function() { d3.select(this).text(formattedTime); };
  },

  _interaction() {
    const _this = this;
    return {
      mouseover(d, i) {
        if (utils.isTouchDevice()) return;
        _this.model.marker.highlightMarker(d);
        //_this._showLabel(d);
      },
      mouseout(d, i) {
        if (utils.isTouchDevice()) return;
        _this.model.marker.clearHighlighted();
      },
      click(d, i) {
        if (utils.isTouchDevice()) return;
        _this.model.marker.selectMarker(d);
      },
      tap(d) {
        d3.event.stopPropagation();
        _this.model.marker.selectMarker(d);
      }
    };
  },

  _highlightBars(d) {
    const _this = this;

    _this.someHighlighted = (_this.model.marker.highlight.length > 0);

    _this.updateBarsOpacity();

    if (!_this.someHighlighted) {
      //hide labels
      _this.labels.selectAll(".vzb-hovered").classed("vzb-hovered", false);
    } else {
      _this._showLabel(_this.model.marker.highlight[0]);
    }
  },

  _showLabel(d) {
    const _this = this;
    const formatter = _this.ui.chart.inpercent ? d3.format(".1%") : _this.model.marker.axis_x.getTickFormatter();
    const sideDim = _this.SIDEDIM;
    const ageDim = _this.AGEDIM;
    const stackDim = _this.STACKDIM;
    const KEYS = this.KEYS;

    const left = _this.sideKeys.indexOf(d[sideDim]);
    const label = _this.labels.select(".vzb-bc-label");
    const bar = _this.bars.select(".vzb-bc-bar-" + d[ageDim]);
    //const label = _this.labels.select("#vzb-bc-label-" + d[ageDim] + "-" + _this._id);
    label.attr("transform", bar.attr("transform"))
      .select(".vzb-bc-age")
      .text(textData => {
        //var total = _this.ui.chart.inpercent ? _this.totalValues[d[sideDim]] : 1;
        let text = _this.stackKeys.length > 1 ? _this.stackItems[d[stackDim]] : _this.frame.label_age[d[ageDim]];
        text = _this.twoSided ? text : text + " " + _this.stackItems[d[stackDim]];
        const value = utils.getValueMD(d, _this.frameAxisX, KEYS);//_this.xScale.invert(d["width_"]);
        //var value = (_this.dataWithTotal || _this.stacked) ? _this.values1.axis_x[d[shiftedAgeDim]][d[sideDim]][d[stackDim]] / total : _this.xScale.invert(d["width_"]);
        return text + ": " + formatter(value);
      })
      .attr("x", (left ? -1 : 1) * (_this.activeProfile.centerWidth * 0.5 + 7))
      .classed("vzb-text-left", left);

    label.classed("vzb-hovered", true);
  },

  /**
   * Executes everytime the container or vizabi is resized
   * Ideally,it contains only operations related to size
   */


  presentationProfileChanges: {
    medium: {
      margin: { right: 80, bottom: 80 },
      infoElHeight: 32
    },
    large: {
      margin: { top: 100, right: 100, left: 100, bottom: 80 },
      infoElHeight: 32
    }
  },

  profiles: {
    "small": {
      margin: {
        top: 70,
        right: 20,
        left: 40,
        bottom: 40
      },
      infoElHeight: 16,
      centerWidth: 2,
      titlesSpacing: 5
    },
    "medium": {
      margin: {
        top: 80,
        right: 60,
        left: 60,
        bottom: 40
      },
      infoElHeight: 20,
      centerWidth: 2,
      titlesSpacing: 10
    },
    "large": {
      margin: {
        top: 100,
        right: 60,
        left: 60,
        bottom: 40
      },
      infoElHeight: 22,
      centerWidth: 2,
      titlesSpacing: 20
    }
  },

  resize() {

    const _this = this;

    this.activeProfile = this.getActiveProfile(this.profiles, this.presentationProfileChanges);

    //this.activeProfile = this.profiles[this.getLayoutProfile()];
    const margin = this.activeProfile.margin;
    const infoElHeight = this.activeProfile.infoElHeight;

    //stage
    this.height = (parseInt(this.element.style("height"), 10) - margin.top - margin.bottom) || 0;
    this.width = (parseInt(this.element.style("width"), 10) - margin.left - margin.right) || 0;

    if (this.height <= 0 || this.width <= 0) return utils.warn("Pop by age resize() abort: vizabi container is too little or has display:none");

    this.graph
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    this.barsCrop
      .attr("width", this.width)
      .attr("height", Math.max(0, this.height));

    this.labelsCrop
      .attr("width", this.width)
      .attr("height", Math.max(0, this.height));

    const groupBy = this.groupBy;

    const domain = this.yScale.domain();
    this.oneBarHeight = this.model.marker.axis_y.scaleType == "ordinal" ? this.height / domain.length : this.height / (domain[1] - domain[0]);
    const barHeight = this.barHeight = this.oneBarHeight * groupBy; // height per bar is total domain height divided by the number of possible markers in the domain
    this.firstBarOffsetY = this.height - this.barHeight;

    if (this.stackBars) this.stackBars.attr("height", barHeight);

    if (this.sideBars) this.sideBars
      .attr("transform", (d, i) => i ? ("scale(-1,1) translate(" + _this.activeProfile.centerWidth + ",0)") : "");


    //update scales to the new range
    this.yScale.range([this.height, 0]);

    const maxRange = this.twoSided ? ((this.width - this.activeProfile.centerWidth) * 0.5) : this.width;

    this.xScale.range([0, maxRange]);

    //apply scales to axes and redraw
    this.yAxis.scale(this.yScale)
      .tickValues([])
      .tickSizeInner(-this.width)
      .tickSizeOuter(0)
      .tickPadding(6)
      .tickSizeMinor(-this.width, 0)
      .labelerOptions({
        scaleType: this.model.marker.axis_y.scaleType,
        toolMargin: margin,
        limitMaxTickNumber: 1
      });

    const format = this.ui.chart.inpercent ? d3.format((groupBy > 3 ? "" : ".1") + "%") : this.model.marker.axis_x.getTickFormatter();

    this.xAxis.scale(this.xScale)
      .tickFormat(format)
      .tickSizeInner(-this.height)
      .tickSizeOuter(0)
      .tickPadding(6)
      .tickSizeMinor(-this.height, 0)
      .labelerOptions({
        scaleType: this.model.marker.axis_x.scaleType,
        toolMargin: margin,
        limitMaxTickNumber: 6
      });

    const translateX = this.twoSided ? ((this.width + _this.activeProfile.centerWidth) * 0.5) : 0;

    this.xAxisEl.attr("transform", "translate(" + translateX + "," + this.height + ")")
      .call(this.xAxis);

    this.yAxisEl.attr("transform", "translate(" + 0 + ",0)")
      .call(this.yAxis);
    //this.xAxisEl.call(this.xAxis);
    this.xAxisLeftEl.classed("vzb-hidden", !this.twoSided);
    if (this.twoSided) {
      if (this.model.marker.axis_x.scaleType !== "ordinal") {
        this.xScaleLeft.range([(this.width - this.activeProfile.centerWidth) * 0.5, 0]);
      } else {
        this.xScaleLeft.rangePoints([(this.width - this.activeProfile.centerWidth) * 0.5, 0]).range();
      }

      this.xAxisLeft.scale(this.xScaleLeft)
        .tickFormat(format)
        .tickSizeInner(-this.height)
        .tickSizeOuter(0)
        .tickPadding(6)
        .tickSizeMinor(-this.height, 0)
        .labelerOptions({
          scaleType: this.model.marker.axis_x.scaleType,
          toolMargin: margin,
          limitMaxTickNumber: 6
        });

      this.xAxisLeftEl.attr("transform", "translate(0," + this.height + ")")
        .call(this.xAxisLeft);
      const zeroTickEl = this.xAxisEl.select(".tick text");
      if (!zeroTickEl.empty()) {
        const zeroTickWidth = zeroTickEl.node().getBBox().width;
        zeroTickEl.attr("dx", -(this.activeProfile.centerWidth + zeroTickWidth) * 0.5);
      }
      this.xAxisEl.select(".tick line").classed("vzb-hidden", true);
   
      //hide left axis zero tick
      const tickNodes = this.xAxisLeftEl.selectAll(".tick").nodes();
      d3.select(tickNodes[tickNodes.length - 1]).classed("vzb-hidden", true);
   }

    const isRTL = this.model.locale.isRTL();

    this.bars.attr("transform", "translate(" + translateX + ",0)");
    this.labels.attr("transform", "translate(" + translateX + ",0)");

    this.title
      .attr("x", margin.left + (this.twoSided ? translateX - this.activeProfile.titlesSpacing : 0))
      .style("text-anchor", this.twoSided ? "end" : "")
      .attr("y", margin.top * 0.7);
    this.titleRight
      .attr("x", margin.left + translateX + this.activeProfile.titlesSpacing)
      .attr("y", margin.top * 0.7);

    this.xTitleEl
      .style("font-size", infoElHeight + "px")
      .attr("transform", "translate(" + (isRTL ? this.width : margin.left * 0.4) + "," + (margin.top * 0.4) + ")");
    this.xTitleEl.select("text").text(this.model.marker.axis_x.getConceptprops().name);

    if (this.xInfoEl.select("svg").node()) {
      const titleBBox = this.xTitleEl.node().getBBox();
      const t = utils.transform(this.xTitleEl.node());
      const hTranslate = isRTL ? (titleBBox.x + t.translateX - infoElHeight * 1.4) : (titleBBox.x + t.translateX + titleBBox.width + infoElHeight * 0.4);

      this.xInfoEl.select("svg")
        .attr("width", infoElHeight + "px")
        .attr("height", infoElHeight + "px");
      this.xInfoEl.attr("transform", "translate("
        + hTranslate + ","
        + (t.translateY - infoElHeight * 0.8) + ")");
    }


    this.year.attr("x", this.width + margin.left).attr("y", margin.top * 0.4);

  },

  updateBarsOpacity(duration) {
    const _this = this;
    //if(!duration)duration = 0;

    const OPACITY_HIGHLT = 1.0;
    const OPACITY_HIGHLT_DIM = this.model.marker.opacityHighlightDim;
    const OPACITY_SELECT = this.model.marker.opacityRegular;
    const OPACITY_REGULAR = this.model.marker.opacityRegular;
    const OPACITY_SELECT_DIM = this.model.marker.opacitySelectDim;

    this.stackBars
    //.transition().duration(duration)
      .style("opacity", d => {

        if (_this.someHighlighted) {
          //highlight or non-highlight
          if (_this.model.marker.isHighlighted(d)) return OPACITY_HIGHLT;
        }

        if (_this.someSelected) {
          //selected or non-selected
          return _this.model.marker.isSelected(d) ? OPACITY_SELECT : OPACITY_SELECT_DIM;
        }

        if (_this.someHighlighted) return OPACITY_HIGHLT_DIM;

        return OPACITY_REGULAR;
      });

    this.stackBars.style("stroke", d => _this.model.marker.isSelected(d) ? "#333" : null);

    const nonSelectedOpacityZero = _this.model.marker.opacitySelectDim < 0.01;

    // when pointer events need update...
    if (nonSelectedOpacityZero != this.nonSelectedOpacityZero) {
      this.stackBars.style("pointer-events", d => (!_this.someSelected || !nonSelectedOpacityZero || _this.model.marker.isSelected(d)) ?
        "visible" : "none");
    }

    this.nonSelectedOpacityZero = _this.model.marker.opacitySelectDim < 0.01;
  }

});

export default BarChartDS;
