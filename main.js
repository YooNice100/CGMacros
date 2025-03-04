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
    
    const path = group.append("path")
        .attr("fill", "none")
        .attr("stroke", type === "Healthy" ? "green" : type === "Pre-Diabetic" ? "orange" : "red")
        .attr("stroke-width", 2);
    
    return { path, xScale, yScale, line, group };
}

function createButtonContainer() {
    return d3.select("body")
        .append("div")
        .attr("class", "button-container");
}

function createButtons(container, options, callback) {
    container.selectAll("*").remove();
    options.forEach((option, i) => {
        container.append("button")
            .attr("class", "button")
            .text(option)
            .attr("data-value", option.toLowerCase().replace(" ", "-"))
            .style("transition-delay", `${i * 0.2}s`)
            .on("click", function() {
                const value = d3.select(this).attr("data-value");
                callback(value);
            });
    });
}

function initSection(container, type) {
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    if (type === "intro") {
        return { figures: null };
    }
    
    if (type === "gut-health") {
        const figures = ["Healthy", "Pre-Diabetic", "Diabetic"].map((type, i) => {
            const x = (i + 1) * (width / 4);
            const figure = drawStickFigure(svg, x, height / 2);
            figure.attr("id", type);
            return figure;
        });
        return { figures };
    }
    
    if (["breakfast", "lunch", "dinner"].includes(type)) {
        const plots = ["Healthy", "Pre-Diabetic", "Diabetic"].map((type, i) => {
            const x = (i + 1) * (width / 4) - 100;
            return createGlucosePlot(svg, x, height / 2, 200, 150, type);
        });
        return { plots };
    }
}

let state = {
    gutHealth: null,
    mealSelections: {
        breakfast: null,
        lunch: null,
        dinner: null
    },
    visualizations: {
        intro: null,
        gutHealth: null,
        breakfast: null,
        lunch: null,
        dinner: null
    }
};

const buttonContainer = createButtonContainer();

// Create a function to handle scroll events
function handleScroll(event) {
    const sections = ["intro", "gut-health", "breakfast", "lunch", "dinner"];
    const currentIndex = Math.floor(window.scrollY / window.innerHeight);
    
    // Check if trying to scroll past a section without making required selections
    if (currentIndex > 1 && !state.gutHealth) {
        // Prevent scrolling past gut health section
        window.scrollTo({
            top: window.innerHeight,
            behavior: 'smooth'
        });
    } else if (currentIndex > 2 && !state.mealSelections.breakfast) {
        // Prevent scrolling past breakfast section
        window.scrollTo({
            top: window.innerHeight * 2,
            behavior: 'smooth'
        });
    } else if (currentIndex > 3 && !state.mealSelections.lunch) {
        // Prevent scrolling past lunch section
        window.scrollTo({
            top: window.innerHeight * 3,
            behavior: 'smooth'
        });
    } else if (currentIndex > 4 && !state.mealSelections.dinner) {
        // Prevent scrolling past dinner section
        window.scrollTo({
            top: window.innerHeight * 4,
            behavior: 'smooth'
        });
    }
}

// Add scroll event listener
window.addEventListener('scroll', handleScroll);

const scroller = scrollama();
scroller.setup({
    step: ".step",
    offset: 0.2,
    debug: false
}).onStepEnter(({ element, index, progress }) => {
    const sections = ["intro", "gut-health", "breakfast", "lunch", "dinner"];
    const currentSection = sections[index];
    
    // Remove active class from all steps
    d3.selectAll(".step").classed("active", false);
    // Add active class to current step
    d3.select(element).classed("active", true);
    
    if (index >= 2) {
        d3.select("body")
            .transition()
            .duration(1000)
            .style("background-color", backgroundColors[currentSection]);
    }
    
    if (!state.visualizations[currentSection]) {
        const container = element.querySelector('.visualization-container');
        state.visualizations[currentSection] = initSection(d3.select(container), currentSection);
    }
    
    // Handle stick figures visibility
    if (currentSection === "gut-health") {
        if (state.visualizations.gutHealth && state.visualizations.gutHealth.figures) {
            state.visualizations.gutHealth.figures.forEach(figure => {
                figure.style("opacity", 1);
            });
        }
    } else {
        if (state.visualizations.gutHealth && state.visualizations.gutHealth.figures) {
            state.visualizations.gutHealth.figures.forEach(figure => {
                figure.style("opacity", 0);
            });
        }
    }
    
    // Show buttons when title is visible
    if (currentSection === "gut-health" && !state.gutHealth) {
        buttonContainer.classed("active", true);
        createButtons(buttonContainer, ["Good Gut Health", "Bad Gut Health"], (value) => {
            state.gutHealth = value;
            buttonContainer.classed("active", false);
        });
    }
    
    if (["breakfast", "lunch", "dinner"].includes(currentSection)) {
        // Hide plots if no selection made yet
        if (state.visualizations[currentSection] && state.visualizations[currentSection].plots) {
            state.visualizations[currentSection].plots.forEach(plot => {
                plot.group.style("opacity", 0);
            });
        }
        
        if (!state.mealSelections[currentSection]) {
            // Show buttons immediately when entering section
            buttonContainer.classed("active", true);
            createButtons(buttonContainer, ["Low Carb", "Medium Carb", "High Carb"], (value) => {
                state.mealSelections[currentSection] = value;
                buttonContainer.classed("active", false);
                
                // Show plots after selection
                if (state.visualizations[currentSection] && state.visualizations[currentSection].plots) {
                    state.visualizations[currentSection].plots.forEach(plot => {
                        plot.group.transition()
                            .duration(500)
                            .style("opacity", 1);
                    });
                }
                
                animateGlucosePlot(currentSection, 1);
            });
        } else {
            // Show plots if selection exists
            if (state.visualizations[currentSection] && state.visualizations[currentSection].plots) {
                state.visualizations[currentSection].plots.forEach(plot => {
                    plot.group.style("opacity", 1);
                });
            }
            animateGlucosePlot(currentSection, progress);
        }
    }
}).onStepExit(({ element, index }) => {
    const sections = ["intro", "gut-health", "breakfast", "lunch", "dinner"];
    const currentSection = sections[index];
    
    if (["breakfast", "lunch", "dinner"].includes(currentSection)) {
        buttonContainer.classed("active", false);
    }
});

function animateGlucosePlot(section, progress = 1) {
    const { plots } = state.visualizations[section];
    const mealEffects = {
        "low-carb": { spike: 20, duration: 60 },
        "medium-carb": { spike: 40, duration: 75 },
        "high-carb": { spike: 60, duration: 90 }
    };
    
    const effect = mealEffects[state.mealSelections[section]];
    const baseLevels = state.gutHealth === "good-gut-health" ? [100, 120, 140] : [120, 140, 160];
    
    plots.forEach((plot, i) => {
        const data = Array.from({ length: 181 }, (_, j) => {
            const time = j;
            let value = baseLevels[i];
            
            if (time >= 0 && time <= effect.duration) {
                value += (effect.spike * (1 - time / effect.duration));
            }
            
            return { time, value };
        });
        
        // Only show data up to the current progress
        const currentData = data.slice(0, Math.floor(progress * data.length));
        
        plot.path
            .datum(currentData)
            .transition()
            .duration(100)
            .attr("d", plot.line);
    });
} 