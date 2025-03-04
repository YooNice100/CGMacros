const margin = { top: 50, right: 50, bottom: 50, left: 50 };
const width = window.innerWidth - margin.left - margin.right;
const height = window.innerHeight * 0.8 - margin.top - margin.bottom;

const backgroundColors = { breakfast: "#FFDAB9", lunch: "#FFFACD", dinner: "#D8BFD8" };

function drawStickFigure(container, x, y, scale = 1) {
    const group = container.append("g")
        .attr("transform", `translate(${x},${y}) scale(${scale})`);
    
    group.append("circle")
        .attr("r", 15)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 2);
    
    group.append("line")
        .attr("x1", 0)
        .attr("y1", 15)
        .attr("x2", 0)
        .attr("y2", 45)
        .attr("stroke", "black")
        .attr("stroke-width", 2);
    
    group.append("line")
        .attr("x1", -20)
        .attr("y1", 25)
        .attr("x2", 20)
        .attr("y2", 25)
        .attr("stroke", "black")
        .attr("stroke-width", 2);
    
    group.append("line")
        .attr("x1", 0)
        .attr("y1", 45)
        .attr("x2", -15)
        .attr("y2", 70)
        .attr("stroke", "black")
        .attr("stroke-width", 2);
    
    group.append("line")
        .attr("x1", 0)
        .attr("y1", 45)
        .attr("x2", 15)
        .attr("y2", 70)
        .attr("stroke", "black")
        .attr("stroke-width", 2);
    
    return group;
}

function createGlucosePlot(container, x, y, width, height, type) {
    const group = container.append("g")
        .attr("transform", `translate(${x},${y})`);
    
    const xScale = d3.scaleLinear()
        .domain([0, 180])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, 200])
        .range([height, 0]);
    
    group.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => `${d/60}hr`));
    
    group.append("g")
        .call(d3.axisLeft(yScale));
    
    const line = d3.line()
        .x(d => xScale(d.time))
        .y(d => yScale(d.value));
    
    const data = Array.from({ length: 181 }, (_, i) => ({
        time: i,
        value: type === "Healthy" ? 100 : type === "Pre-Diabetic" ? 120 : 140
    }));
    
    const path = group.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", type === "Healthy" ? "green" : type === "Pre-Diabetic" ? "orange" : "red")
        .attr("stroke-width", 2)
        .attr("d", line);
    
    return { path, data, xScale, yScale };
}

function createMealButtons() {
    const buttonContainer = d3.select("body")
        .append("div")
        .attr("class", "meal-buttons")
        .style("position", "fixed")
        .style("bottom", "20px")
        .style("left", "50%")
        .style("transform", "translateX(-50%)")
        .style("z-index", "1000");
    
    const mealTypes = ["High Carb", "Low Carb", "Balanced"];
    mealTypes.forEach(type => {
        buttonContainer.append("button")
            .attr("class", "meal-option")
            .attr("data-meal", type.toLowerCase().replace(" ", "-"))
            .text(type)
            .style("margin", "0 10px")
            .style("padding", "8px 16px")
            .style("border", "none")
            .style("border-radius", "4px")
            .style("background-color", "#4CAF50")
            .style("color", "white")
            .style("cursor", "pointer");
    });
}

function initSection(container) {
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const figures = ["Healthy", "Pre-Diabetic", "Diabetic"].map((type, i) => {
        const x = (i + 1) * (width / 4);
        const figure = drawStickFigure(svg, x, 100);
        figure.attr("id", type);
        return figure;
    });
    
    const plots = ["Healthy", "Pre-Diabetic", "Diabetic"].map((type, i) => {
        const x = (i + 1) * (width / 4) - 100;
        return createGlucosePlot(svg, x, height / 2, 200, 150, type);
    });
    
    return { figures, plots };
}

let mealSelections = {
    breakfast: null,
    lunch: null,
    dinner: null
};

let visualizations = {
    breakfast: null,
    lunch: null,
    dinner: null
};

const scroller = scrollama();
scroller.setup({
    step: ".step",
    offset: 0.5,
    debug: false
}).onStepEnter(({ element, index }) => {
    d3.select("body")
        .transition()
        .duration(1000)
        .style("background-color", backgroundColors[Object.keys(backgroundColors)[index]]);
    
    const currentSection = element.querySelector('.step-title').textContent.toLowerCase();
    
    if (!visualizations[currentSection]) {
        const container = element.querySelector('.visualization-container');
        visualizations[currentSection] = initSection(d3.select(container));
    }
    
    if (visualizations[currentSection]) {
        const { plots } = visualizations[currentSection];
        plots.forEach((plot, i) => {
            const baseLevels = [100, 120, 140];
            const mealEffect = mealSelections[currentSection];
            
            const newData = Array.from({ length: 181 }, (_, j) => {
                const time = j;
                let value = baseLevels[i];
                
                if (mealEffect) {
                    const { spike, duration } = mealEffect;
                    if (time >= 0 && time <= duration) {
                        value += (spike * (1 - time / duration));
                    }
                }
                
                return { time, value };
            });
            
            plot.path.transition()
                .duration(1000)
                .attr("d", d3.line()
                    .x(d => plot.xScale(d.time))
                    .y(d => plot.yScale(d.value))(newData));
        });
    }
});

function updateGlucose(mealType) {
    const mealEffects = {
        "high-carb": { spike: 60, duration: 90 },
        "low-carb": { spike: 20, duration: 60 },
        "balanced": { spike: 40, duration: 75 }
    };
    
    const currentSection = document.querySelector('.step.active .step-title')?.textContent.toLowerCase();
    if (currentSection) {
        mealSelections[currentSection] = mealEffects[mealType];
        
        if (visualizations[currentSection]) {
            const { plots } = visualizations[currentSection];
            plots.forEach((plot, i) => {
                const effect = mealEffects[mealType];
                const baseLevel = i === 0 ? 100 : i === 1 ? 120 : 140;
                
                const newData = Array.from({ length: 181 }, (_, j) => {
                    const time = j;
                    let value = baseLevel;
                    
                    if (time >= 0 && time <= effect.duration) {
                        value += (effect.spike * (1 - time / effect.duration));
                    }
                    
                    return { time, value };
                });
                
                plot.path.transition()
                    .duration(1000)
                    .attr("d", d3.line()
                        .x(d => plot.xScale(d.time))
                        .y(d => plot.yScale(d.value))(newData));
            });
        }
    }
}

createMealButtons();

d3.selectAll(".meal-option").on("click", function() {
    const mealType = d3.select(this).attr("data-meal");
    updateGlucose(mealType);
}); 