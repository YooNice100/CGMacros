const margin = { top: 50, right: 50, bottom: 50, left: 50 };
const width = window.innerWidth - margin.left - margin.right;
const height = window.innerHeight * 0.8 - margin.top - margin.bottom;

const backgroundColors = { breakfast: "#FFDAB9", lunch: "#FFFACD", dinner: "#D8BFD8" };


function updateVisualization() {
    // if (!state.gutHealth) return; // Ensure that gut health data is loaded first
    if (!state.gutHealth || !state.glucoseData || state.glucoseData.length === 0) return; // Ensure data is loaded

    const container = document.querySelector('.visualization-container');
    const visualization = state.visualizations.gutHealth;

    // Clear any existing content
    container.innerHTML = '';

    // Initialize the figures if not already done
    if (!visualization) {
        state.visualizations.gutHealth = initSection(d3.select(container), "gut-health");
    }

    // Show the stick figures with the current gut health condition
    if (state.visualizations.gutHealth && state.visualizations.gutHealth.figures) {
        state.visualizations.gutHealth.figures.forEach(figure => {
            figure.style("opacity", 1); // Make sure the figures are visible
        });
    }

    // If you want to do other updates (like adjusting colors or text), you can add more logic here
    console.log(`Gut Health Visualization Updated: ${state.gutHealth}`);
}



function loadGutHealthData(gutHealthSelection) {
    let fileName = gutHealthSelection === "bad-gut health" ? "gutdata/gut1.csv" :
                   gutHealthSelection === "average-gut health" ? "gutdata/gut2.csv" :
                   "gutdata/gut3.csv";  // Default to "good"

    d3.csv(fileName).then(data => {
        state.glucoseData = data.filter(d => d["Carb Category"] && d["Meal Phase"] && d["Carb Category"] !== "" && d["Meal Phase"] !== "")
            .map(d => ({
                subject: d.subject,
                timestamp: new Date(d.Timestamp),
                glucose: +d["Dexcom GL"],
                carbCategory: d["Carb Category"],
                diabetesStatus: d["Diabetes Status"],
                mealPhase: d["Meal Phase"]
            }));
        console.log('Loaded Glucose Data', state.glucoseData)

        // state.gutHealth = gutHealthSelection;
        // document.getElementById("meal-phase-selection").style.display = "block";
        updateVisualization();
    }).catch(error => {
        console.error("Error loading gut health data:", error);
    });
}


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
        .x(d => xScale(d.timestamp))  // Use timestamp as x value (converted into time)
        .y(d => yScale(d.glucose));  
    
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
    glucoseData: [],
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

const sections = ["intro", "gut-health", "breakfast", "lunch", "dinner"];

// Create a function to handle scroll events
function handleScroll(event) {
    // const sections = ["intro", "gut-health", "breakfast", "lunch", "dinner"];
    const currentIndex = Math.floor(window.scrollY / window.innerHeight);
    
    // Only prevent scrolling past gut health section without a selection
    if (currentIndex > 1 && !state.gutHealth) {
        // Prevent scrolling past gut health section
        window.scrollTo({
            top: window.innerHeight,
            behavior: 'smooth'
        });
    }
}

// Add scroll event listener
window.addEventListener('scroll', handleScroll);


const scroller = scrollama();
scroller.setup({
    step: ".step",
    offset: 0.1,
    debug: false
}).onStepEnter(({ element, index, progress }) => {
    // const sections = ["intro", "gut-health", "breakfast", "lunch", "dinner"];
    const currentSection = sections[index];

    console.log('Entered step:', currentSection);  // This will print the current section
    console.log('Step index:', index);  
 
    // Remove active class from all steps
    d3.selectAll(".step").classed("active", false);
    // Add active class to current step
    d3.select(element).classed("active", true);
    
    // Changing the background colors
    if (index >= 2) {
        d3.select("body")
            .transition()
            .duration(1000)
            .style("background-color", backgroundColors[currentSection]);
    }
    
    // If the visualization in the current section hasn't been initialized yet, then it will initialize it inside of the .visualization-container
    if (!state.visualizations[currentSection]) {
        const container = element.querySelector('.visualization-container');
        state.visualizations[currentSection] = initSection(d3.select(container), currentSection);
    }
    
    // Handle stick figures visibility
    // CHANGE THIS SO IT IS VISIBLE ON GUT HEALTH, BREAKFAST, LUNCH AND DINNER
    if (currentSection === "gut-health") {
        if (state.visualizations.gutHealth && state.visualizations.gutHealth.figures) {
            state.visualizations.gutHealth.figures.forEach(figure => {
                figure.style("opacity", 1);
            });
        }
        // If gut health data is not loaded, load it now
        if (!state.gutHealth) {
            buttonContainer.classed("active", true);
            createButtons(buttonContainer, ["Good Gut Health", "Average Gut Health", "Bad Gut Health"], (value) => {
                state.gutHealth = value;
                console.log('selected gut health value', value);
                loadGutHealthData(value); // Load the corresponding data
                console.log("Gut Health Data Loaded", state.glucoseData);

                buttonContainer.classed("active", false);
            }); 
        }

    } else {
        if (state.visualizations.gutHealth && state.visualizations.gutHealth.figures) {
            state.visualizations.gutHealth.figures.forEach(figure => {
                figure.style("opacity", 0);
            });
        }
    }
    
    console.log('length of glucoseData', state.glucoseData.length)

    if (["breakfast", "lunch", "dinner"].includes(currentSection)) {
        // Show all plots immediately
        if (state.visualizations[currentSection] && state.visualizations[currentSection].plots) {
            state.visualizations[currentSection].plots.forEach(plot => {
                plot.group.style("opacity", 1);
            });
        }
        
        // Show toggle buttons immediately when entering section
        buttonContainer.classed("active", true);
        createButtons(buttonContainer, ["Low Carb", "Medium Carb", "High Carb"], (value) => {
            // Update the active state of buttons
            buttonContainer.selectAll(".button")
                .classed("active", false);
            buttonContainer.select(`[data-value="${value}"]`)
                .classed("active", true);

            // state.mealSelections[currentSection] = value;
            // Animate the selected carb level
            animateGlucosePlot(currentSection, value);
        });
        
        // Set initial selection if not set
        if (!state.mealSelections[currentSection]) {
            state.mealSelections[currentSection] = "low-carb";
            // Trigger initial animation
            animateGlucosePlot(currentSection, "low-carb");
        } else {
            // Animate current selection
            animateGlucosePlot(currentSection, state.mealSelections[currentSection]);
        }
    }
}).onStepExit(({ element, index }) => {
    // const sections = ["intro", "gut-health", "breakfast", "lunch", "dinner"];
    const currentSection = sections[index];
    
    // Only hide buttons when leaving the gut health section
    if (currentSection === "gut-health") {
        buttonContainer.classed("active", false);
    }
});

function animateGlucosePlot(mealPhase, selectedCarb) {
    if (!state.glucoseData || state.glucoseData.length === 0) {
        console.error("Glucose data is not available!");
        return; // Exit the function if glucose data is not available
    }

    state.mealSelections[mealPhase] = selectedCarb; // Save carb selection

    const visualization = state.visualizations[mealPhase];
    if (!visualization) return; // Ensure visualization exists

    const { plots } = visualization; // Extract plots for different diabetes statuses

    // Filter data based on Meal Phase & Carb Category
    const filteredData = state.glucoseData.filter(d =>
        d.mealPhase === mealPhase && d.carbCategory === selectedCarb
    );

    // Group by Diabetes Status
    let groupedData = d3.group(filteredData, d => d.diabetesStatus);

    ["No Diabetes", "Pre-Diabetes", "Type 2 Diabetes"].forEach((status, i) => {
        const plot = plots[i]; // Get corresponding plot

        if (!plot || !plot.xScale || !plot.yScale || !plot.xAxis || !plot.yAxis || !plot.path) {
            console.error(`Plot for ${status} is missing required properties.`);
            return; // Skip if plot is missing required properties
        }

        const dataForStatus = groupedData.get(status) || [];

        // Sort data by timestamp
        const sortedData = dataForStatus.sort((a, b) => a.timestamp - b.timestamp);

        // Update x and y scales (Time vs Glucose)
        plot.xScale.domain(d3.extent(sortedData, d => d.timestamp));
        plot.yScale.domain(d3.extent(sortedData, d => d.glucose));

        // Update x and y axes
        plot.xAxis.transition().duration(1000).call(d3.axisBottom(plot.xScale));
        plot.yAxis.transition().duration(1000).call(d3.axisLeft(plot.yScale));

        // Bind data and animate line transition
        plot.path
            .datum(sortedData)
            .transition()
            .duration(1000)
            .attr("d", plot.line
                .x(d => plot.xScale(d.timestamp))
                .y(d => plot.yScale(d.glucose))
            );
    });

    console.log(`Updated ${mealPhase} plot for ${selectedCarb} carbs.`);
}

