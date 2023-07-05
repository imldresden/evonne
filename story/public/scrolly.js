// using d3 for convenience
const main = d3.select("main");
const scrolly = main.select("#scrolly");
const figure = scrolly.select("figure");
const article = scrolly.select("article");
const step = article.selectAll(".step");

const scroller = scrollama();

function handleResize() {
    const stepH = Math.floor(window.innerHeight * 0.75);
    step.style("height", stepH + "px");

    const figureHeight = window.innerHeight - 200;
    const figureMarginTop = 100;

    figure
        .style("height", figureHeight + "px")
        .style("top", figureMarginTop + "px");

    scroller.resize();
}

function handleStepEnter(response) {
    console.log(response); // response = { element, direction, index 
    step.classed("is-active", function (d, i) { return i === response.index; });

    // update graphic based on step
    figure.select("p").text(response.index + 1);
}

function init() {
    handleResize();
    scroller
        .setup({
            step: "#scrolly article .step",
            offset: 0.53,
            debug: false
        })
        .onStepEnter(handleStepEnter);
}

init();