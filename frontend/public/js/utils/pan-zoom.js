const thumbnailViewer = function (options) {

    const returnable = {

    };
    let _main, _thumb;

    const initThumb = function () {
        if (document.getElementById("sidebarTabRepairs") && document.getElementById("sidebarTabRepairs").classList.contains("active")) {
            return;
        }

        const minimapSelector = options.containerSelector + " .minimap-view";
        const thumbViewObjectElem = document.querySelector(minimapSelector);
        if (thumbViewObjectElem) {
            thumbViewObjectElem.remove();
        } else {
            return;
        }

        const thumbSVG = document.getElementById(options.mainViewId).cloneNode(true);
        thumbSVG.classList.add("minimap", "minimap-view");

        document.querySelector(minimapSelector + "-container").append(thumbSVG);
        const thumbViewSVGDoc = getSVGDocument(thumbViewObjectElem);

        if (options.onThumbnailSVGLoaded) {
            options.onThumbnailSVGLoaded(thumbViewSVGDoc);
        }

        if (_thumb) {
            _thumb.destroy();
            _thumb = null;
        }
        const thumb = svgPanZoom(minimapSelector, {
            zoomEnabled: false,
            panEnabled: false,
            controlIconsEnabled: false,
            dblClickZoomEnabled: false,
            preventMouseEventsDefault: true,
        });

        bindThumbnail(undefined, thumb);
        if (options.onThumbnailShown) {
            options.onThumbnailShown(thumbViewSVGDoc, thumb);
        }

    }

    const initMain = function () {
        const mainViewSVGDoc = getSVGDocument(document.getElementById(options.mainViewId));

        if (_main) {
            _main.destroy();
            _main = null;
        }

        const main = svgPanZoom("#" + options.mainViewId, {
            zoomEnabled: true,
            controlIconsEnabled: true,
            fit: false,
            center: true,
            minZoom: 0.1,
            dblClickZoomEnabled: false,
        });

        bindThumbnail(main, undefined);
        if (options.onMainViewShown) {
            options.onMainViewShown(mainViewSVGDoc, main);
        }

        const tooltips = document.querySelectorAll(".svg-pan-zoom-control.tooltipped");
        M.Tooltip.init(tooltips, {
            enterDelay: 0,
            exitDelay: 0,
            inDuration: 100,
            outDuration: 100
        });
    }

    const getSVGDocument = function (objectElem) {
        return objectElem.nodeName === "svg"
            ? objectElem
            : objectElem.getSVGDocument();
    }

    const bindThumbnail = function (main, thumb) {

        if (!_main && main) {
            _main = main;
        }
        if (!_thumb && thumb) {
            _thumb = thumb;
        }
        if (!_main || !_thumb) {
            return;
        }

        let resizeTimer;
        const interval = 300; //msec
        window.addEventListener("resize", function (event) {
            if (resizeTimer !== false) {
                clearTimeout(resizeTimer);
            }
            resizeTimer = setTimeout(function () {
                _main.resize();
                _thumb.resize();
            }, interval);
        });

        _main.setOnZoom(function (level) {
            _thumb.updateThumbScope();
            if (options.onZoom) {
                options.onZoom(_main, _thumb, level);
            }
        });

        _main.setOnPan(function (point) {
            _thumb.updateThumbScope();
            if (options.onPan) {
                options.onPan(_main, _thumb, point);
            }
        });

        const _updateThumbScope = function (main, thumb, scope) {
            const mainPanX = main.getPan().x
                , mainPanY = main.getPan().y
                , mainWidth = main.getSizes().width
                , mainHeight = main.getSizes().height
                , mainZoom = main.getSizes().realZoom
                , thumbPanX = thumb.getPan().x
                , thumbPanY = thumb.getPan().y
                , thumbZoom = thumb.getSizes().realZoom;

            const thumByMainZoomRatio = thumbZoom / mainZoom;

            const scopeX = thumbPanX - mainPanX * thumByMainZoomRatio;
            const scopeY = thumbPanY - mainPanY * thumByMainZoomRatio;
            const scopeWidth = mainWidth * thumByMainZoomRatio;
            const scopeHeight = mainHeight * thumByMainZoomRatio;

            scope.setAttribute("x", scopeX);
            scope.setAttribute("y", scopeY);
            scope.setAttribute("width", scopeWidth);
            scope.setAttribute("height", scopeHeight);
        };

        _thumb.updateThumbScope = function () {
            const scope = document.querySelector(options.containerSelector + " .scope");
            _updateThumbScope(_main, _thumb, scope);
        }
        _thumb.updateThumbScope();

        const _updateMainViewPan = function (clientX, clientY, scopeContainer, main, thumb) {
            const dim = scopeContainer.getBoundingClientRect()
                , mainWidth = main.getSizes().width
                , mainHeight = main.getSizes().height
                , mainZoom = main.getSizes().realZoom
                , thumbWidth = thumb.getSizes().width
                , thumbHeight = thumb.getSizes().height
                , thumbZoom = thumb.getSizes().realZoom;

            const thumbPanX = clientX - dim.left - thumbWidth / 2;
            const thumbPanY = clientY - dim.top - thumbHeight / 2;
            const mainPanX = - thumbPanX * mainZoom / thumbZoom;
            const mainPanY = - thumbPanY * mainZoom / thumbZoom;
            main.pan({ x: mainPanX, y: mainPanY });
        };

        const scopeContainer = document.querySelector(options.containerSelector + " .scope-container");
        const updateMainViewPan = function (evt) {
            if (evt.which == 0 && evt.button == 0) {
                return false;
            }
            _updateMainViewPan(evt.clientX, evt.clientY, scopeContainer, _main, _thumb);
        }

        let dragging = false;
        scopeContainer.addEventListener("mousedown", () => {
            dragging = true;
        })
        scopeContainer.addEventListener("mouseup", () => {
            dragging = false;
        })
        scopeContainer.addEventListener("click", e => {
            updateMainViewPan(e);
        });

        scopeContainer.addEventListener("mousemove", e => {
            if (dragging) {
                updateMainViewPan(e);
            }
        });

        returnable.main = _main;
        returnable.thumb = _thumb;

    };

    for (const c of document.getElementsByClassName("toggles-sidebar")) {
        c.addEventListener("click", initThumb);
    }

    document.addEventListener('reinit-minimap', () => {
        if (_main) {
            _main.resize();
        }
        if (_thumb) {
            _thumb.resize();
            _thumb.updateThumbScope();
        }

    });

    let once = true; // necessary to have multiple instances of this behavior
    document.addEventListener("drawend", (e) => {
        if (once) {
            if (e.detail && e.detail.main !== options.mainViewId) {
                return;
            } else {
                setTimeout(() => {
                    initMain();
                }, 50);
                once = false;
            }
        }
    });

    document.addEventListener("drawend", (e) => {
        if (e.detail && e.detail.main !== options.mainViewId) {
            return;
        }
        setTimeout(() => {
            initThumb();
        }, 50);
    });

    return returnable;
};

export default thumbnailViewer;
