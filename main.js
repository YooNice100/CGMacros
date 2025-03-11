const margin = { top: 80, right: 50, bottom: 150, left: 50 };
const width = window.innerWidth - margin.left - margin.right;
const height = window.innerHeight - margin.top - margin.bottom;

const backgroundColors = { 
    intro: "#FFFACD",         // Light yellow for all intro sections
    "meet-ben": "#FFFACD",    // Light yellow
    "meet-tim": "#FFFACD",    // Light yellow
    "meet-joey": "#FFFACD",   // Light yellow
    compare: "#FFFACD",       // Light yellow
    "gut-health": "#FFFACD",  // Light yellow
    breakfast: "#FFE4B5",     // Moccasin - warm morning color
    lunch: "#87CEEB",         // Sky Blue - bright midday color
    dinner: "#B19CD9"         // Medium purple - evening color
};

function updateVisualization() {
    if (!state.gutHealth || !state.glucoseData || state.glucoseData.length === 0) return;

    const container = document.querySelector('.visualization-container');
    const visualization = state.visualizations.gutHealth;

    container.innerHTML = '';

    if (!visualization) {
        state.visualizations.gutHealth = initSection(d3.select(container), "gut-health");
    }

    if (state.visualizations.gutHealth && state.visualizations.gutHealth.figures) {
        state.visualizations.gutHealth.figures.forEach(figure => {
            figure.style("opacity", 1);
        });
    }

    console.log(`Gut Health Visualization Updated: ${state.gutHealth}`);
}

function loadGutHealthData(gutHealthSelection) {
    let fileName = gutHealthSelection === "bad-gut-health" ? "gutdata/gut1.csv" :
                   gutHealthSelection === "average-gut-health" ? "gutdata/gut2.csv" :
                   "gutdata/gut3.csv";

    console.log('Loading data from file:', fileName);
    
    d3.csv(fileName).then(data => {
        console.log('Raw data loaded, number of rows:', data.length);
        console.log('First row of data:', data[0]);
        console.log('Available columns:', Object.keys(data[0]));
        
        console.log('Unique Carb Categories:', [...new Set(data.map(d => d["Carb Category"]))]);
        console.log('Unique Meal Phases:', [...new Set(data.map(d => d["Meal Phase"]))]);
        console.log('Unique Diabetes Status:', [...new Set(data.map(d => d["Diabetes Status"]))]);
        
        const filteredData = data.filter(d => {
            const hasValidData = d["Carb Category"] && d["Meal Phase"] && d["Carb Category"] !== "" && d["Meal Phase"] !== "";
            if (!hasValidData) {
                console.log('Filtered out row:', d);
            }
            return hasValidData;
        }).map(d => {
            const mapped = {
                subject: d.subject,
                timestamp: new Date(d.Timestamp),
                glucose: +d["Dexcom GL"],
                carbCategory: d["Carb Category"],
                diabetesStatus: d["Diabetes Status"],
                mealPhase: d["Meal Phase"]
            };
            return mapped;
        });
            
        console.log('Filtered and mapped data:', filteredData);
        console.log('Number of data points after filtering:', filteredData.length);
        
        state.glucoseData = filteredData;
        state.gutHealth = gutHealthSelection;
        console.log('State after loading:', {
            gutHealth: state.gutHealth,
            glucoseDataLength: state.glucoseData.length,
            firstDataPoint: state.glucoseData[0]
        });
        
        updateVisualization();
    }).catch(error => {
        console.error("Error loading gut health data:", error);
        console.error("Error details:", error.message);
    });
}

function drawStickFigure(container, x, y, scale = 0.8) {
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
    
    // Create tooltip div if it doesn't exist
    let tooltip = d3.select("body").select(".tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
    }
    
    const clipPath = group.append("defs")
        .append("clipPath")
        .attr("id", `clip-${type.replace(/\s+/g, '-').toLowerCase()}`)
        .append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 0);
    
    const xScale = d3.scaleTime()
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, 400])
        .range([height, 0]);
    
    const plotArea = group.append("g")
        .attr("clip-path", `url(#clip-${type.replace(/\s+/g, '-').toLowerCase()})`);
    
    const xAxis = group.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .ticks(4)
            .tickFormat(d => {
                const hours = d3.timeHour.count(d3.timeHour.floor(d), d);
                return `${hours}hr`;
            }));
    
    group.append("text")
        .attr("x", width / 2)
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Time After Meal");
    
    const yAxis = group.append("g")
        .call(d3.axisLeft(yScale));
    
    group.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -height/2)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Glucose Level (mg/dL)");

    const line = d3.line()
        .x(d => xScale(d.timestamp))
        .y(d => yScale(d.glucose))
        .curve(d3.curveMonotoneX);
    
    const path = plotArea.append("path")
        .attr("fill", "none")
        .attr("stroke", type === "No Diabetes" ? "green" : type === "Pre-Diabetes" ? "orange" : "red")
        .attr("stroke-width", 2);

    // Add invisible overlay for better hover detection
    const overlay = plotArea.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .style("opacity", 0);

    // Add circle that will move along the line
    const focus = group.append("g")
        .attr("class", "focus")
        .style("display", "none");

    focus.append("circle")
        .attr("r", 4.5)
        .attr("fill", type === "No Diabetes" ? "green" : type === "Pre-Diabetes" ? "orange" : "red")
        .attr("stroke", "white")
        .attr("stroke-width", 2);

    function mousemove(event) {
        const bisect = d3.bisector(d => d.timestamp).left;
        const mouseX = d3.pointer(event)[0];
        const x0 = xScale.invert(mouseX);
        const data = path.datum();
        if (!data) return;
        
        const i = bisect(data, x0, 1);
        const d0 = data[i - 1];
        const d1 = data[i];
        if (!d0 || !d1) return;
        
        const d = x0 - d0.timestamp > d1.timestamp - x0 ? d1 : d0;
        
        focus.attr("transform", `translate(${xScale(d.timestamp)},${yScale(d.glucose)})`);
        focus.style("display", null);
        
        const timeAfterMeal = d3.timeHour.count(data[0].timestamp, d.timestamp);
        tooltip.html(`
            <strong>${type}</strong><br/>
            Time: ${timeAfterMeal}hr<br/>
            Glucose: ${Math.round(d.glucose)} mg/dL
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .style("opacity", 1);
    }

    function mouseout() {
        focus.style("display", "none");
        tooltip.style("opacity", 0);
    }

    overlay
        .on("mousemove", mousemove)
        .on("mouseout", mouseout);
    
    return { path, xScale, yScale, line, group, xAxis, yAxis };
}

function createButtonContainer() {
    return d3.select("body")
        .append("div")
        .attr("class", "button-container")
        .style("position", "fixed")
        .style("bottom", "20px")
        .style("left", "50%")
        .style("transform", "translateX(-50%)")
        .style("text-align", "center")
        .style("z-index", "1000");
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

    if (type === "meet-ben") {
        const figure = drawStickFigure(svg, width / 2, height / 2, 2);
        figure.attr("id", "ben-intro");
        return { figures: [figure] };
    }

    if (type === "meet-tim") {
        // Draw Ben small in top-left
        const benFigure = drawStickFigure(svg, width / 4, height / 6, 0.8);
        benFigure.attr("id", "ben-small");
        
        // Add Ben's label
        svg.append("text")
            .attr("x", width / 4)
            .attr("y", height / 6 + 90)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Ben - No Diabetes");

        // Draw Tim large in center
        const timFigure = drawStickFigure(svg, width / 2, height / 2, 2);
        timFigure.attr("id", "tim-intro");
        
        return { figures: [benFigure, timFigure] };
    }

    if (type === "meet-joey") {
        // Draw Ben small in top-left
        const benFigure = drawStickFigure(svg, width / 4, height / 6, 0.8);
        benFigure.attr("id", "ben-small");
        
        // Add Ben's label
        svg.append("text")
            .attr("x", width / 4)
            .attr("y", height / 6 + 90)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Ben - No Diabetes");

        // Draw Tim small in top-center
        const timFigure = drawStickFigure(svg, width / 2, height / 6, 0.8);
        timFigure.attr("id", "tim-small");
        
        // Add Tim's label
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 6 + 90)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Tim - Pre-Diabetes");

        // Draw Joey large in center
        const joeyFigure = drawStickFigure(svg, width / 2, height / 2, 2);
        joeyFigure.attr("id", "joey-intro");
        
        return { figures: [benFigure, timFigure, joeyFigure] };
    }

    if (type === "compare") {
        // Draw all three figures small at the top
        const benFigure = drawStickFigure(svg, width / 4, height / 6, 0.8);
        benFigure.attr("id", "ben-small");
        
        const timFigure = drawStickFigure(svg, width / 2, height / 6, 0.8);
        timFigure.attr("id", "tim-small");
        
        const joeyFigure = drawStickFigure(svg, 3 * width / 4, height / 6, 0.8);
        joeyFigure.attr("id", "joey-small");

        // Add labels
        svg.append("text")
            .attr("x", width / 4)
            .attr("y", height / 6 + 90)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Ben - No Diabetes");

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 6 + 90)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Tim - Pre-Diabetes");

        svg.append("text")
            .attr("x", 3 * width / 4)
            .attr("y", height / 6 + 90)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Joey - Type 2 Diabetes");

        return { figures: [benFigure, timFigure, joeyFigure] };
    }
    
    if (type === "gut-health") {
        const figures = ["Healthy", "Pre-Diabetic", "Diabetic"].map((type, i) => {
            const x = (i + 1) * (width / 4);
            const figure = drawStickFigure(svg, x, height / 2);
            figure.attr("id", type);
            return figure;
        });

        // Add labels under each stick figure
        ["Healthy", "Pre-Diabetic", "Diabetic"].forEach((type, i) => {
            const x = (i + 1) * (width / 4);
            svg.append("text")
                .attr("x", x)
                .attr("y", height / 2 + 90)
                .attr("text-anchor", "middle")
                .style("font-size", "14px")
                .text(type === "Healthy" ? "Ben - No Diabetes" : 
                     type === "Pre-Diabetic" ? "Tim - Pre-Diabetes" : 
                     "Joey - Type 2 Diabetes");
        });

        return { figures };
    }
    
    if (["breakfast", "lunch", "dinner"].includes(type)) {
        // Add title at the top
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .style("font-size", "24px")
            .style("font-weight", "bold")
            .text(type.charAt(0).toUpperCase() + type.slice(1));

        const figures = ["No Diabetes", "Pre-Diabetes", "Type 2 Diabetes"].map((diabetesType, i) => {
            // Adjust spacing to use 1/6, 3/6, and 5/6 of width instead of 1/4, 2/4, and 3/4
            const x = ((i * 2) + 1) * (width / 6);
            const figure = drawStickFigure(svg, x, height / 6);
            figure.attr("id", `${type}-${diabetesType}`);
            
            // Add character name and diabetes type label under stick figure
            svg.append("text")
                .attr("x", x)
                .attr("y", height / 6 + 90)
                .attr("text-anchor", "middle")
                .style("font-size", "14px")
                .text(diabetesType === "No Diabetes" ? "Ben - No Diabetes" : 
                     diabetesType === "Pre-Diabetes" ? "Tim - Pre-Diabetes" : 
                     "Joey - Type 2 Diabetes");
                
            return figure;
        });

        const plots = ["No Diabetes", "Pre-Diabetes", "Type 2 Diabetes"].map((diabetesType, i) => {
            const plotWidth = 400;  // Increased from 350
            const plotHeight = 300;  // Increased from 250 to 300
            // Use same x-coordinate calculation as figures
            const x = ((i * 2) + 1) * (width / 6) - (plotWidth / 2);
            return createGlucosePlot(svg, x, height / 2.5, plotWidth, plotHeight, diabetesType);
        });

        return { figures, plots };
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

const sections = ["intro", "meet-ben", "meet-tim", "meet-joey", "compare", "gut-health", "breakfast", "lunch", "dinner"];

function handleScroll(event) {
    const currentIndex = Math.floor(window.scrollY / window.innerHeight);
    const currentSection = sections[currentIndex];
    
    // Only prevent scrolling if we're trying to scroll past the gut health section without making a selection
    if (currentSection === "gut-health" && !state.gutHealth) {
        window.scrollTo({
            top: window.innerHeight * sections.indexOf("gut-health"),
            behavior: 'smooth'
        });
    }
}

window.addEventListener('scroll', handleScroll);

const scroller = scrollama();
scroller.setup({
    step: ".step",
    offset: 0.1,
    debug: false
}).onStepEnter(({ element, index, progress }) => {
    const currentSection = sections[index];

    console.log('Entered step:', currentSection);
    console.log('Step index:', index);  
 
    d3.selectAll(".step").classed("active", false);
    d3.select(element).classed("active", true);
    
    // Apply background color for all sections
    document.body.style.backgroundColor = backgroundColors[currentSection];
    document.body.style.transition = 'background-color 1s ease';

    if (!state.visualizations[currentSection]) {
        const container = element.querySelector('.visualization-container');
        state.visualizations[currentSection] = initSection(d3.select(container), currentSection);
    }
    
    if (currentSection === "gut-health") {
        if (state.visualizations.gutHealth && state.visualizations.gutHealth.figures) {
            state.visualizations.gutHealth.figures.forEach(figure => {
                figure.style("opacity", 1);
            });
        }
        if (!state.gutHealth) {
            buttonContainer.classed("active", true);
            createButtons(buttonContainer, ["Good Gut Health", "Average Gut Health", "Bad Gut Health"], (value) => {
                const gutHealthValue = value.toLowerCase().replace(" ", "-");
                state.gutHealth = gutHealthValue;
                loadGutHealthData(gutHealthValue);
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

    if (["breakfast", "lunch", "dinner"].includes(currentSection)) {
        const visualization = state.visualizations[currentSection];
        if (visualization) {
            if (visualization.figures) {
                visualization.figures.forEach(figure => {
                    figure.style("opacity", 1);
                });
            }
            if (visualization.plots) {
                visualization.plots.forEach(plot => {
                    plot.group.style("opacity", 1);
                });
            }
        }
        
        buttonContainer.classed("active", true);
        const buttonOptions = currentSection === "breakfast" ? 
            ["Low Carb", "Medium Carb"] : 
            ["Low Carb", "Medium Carb", "High Carb"];
            
        createButtons(buttonContainer, buttonOptions, (value) => {
            buttonContainer.selectAll(".button")
                .classed("active", false);
            buttonContainer.select(`[data-value="${value}"]`)
                .classed("active", true);
            state.mealSelections[currentSection] = value;
            animateGlucosePlot(currentSection, value);
        });
        
        if (!state.mealSelections[currentSection]) {
            state.mealSelections[currentSection] = "low-carb";
            animateGlucosePlot(currentSection, "low-carb");
            buttonContainer.select(`[data-value="low-carb"]`)
                .classed("active", true);
        } else {
            animateGlucosePlot(currentSection, state.mealSelections[currentSection]);
            buttonContainer.select(`[data-value="${state.mealSelections[currentSection]}"]`)
                .classed("active", true);
        }
    } else {
        const mealSections = ["breakfast", "lunch", "dinner"];
        mealSections.forEach(section => {
            const visualization = state.visualizations[section];
            if (visualization) {
                if (visualization.figures) {
                    visualization.figures.forEach(figure => {
                        figure.style("opacity", 0);
                    });
                }
                if (visualization.plots) {
                    visualization.plots.forEach(plot => {
                        plot.group.style("opacity", 0);
                    });
                }
            }
        });
    }
}).onStepExit(({ element, index }) => {
    const currentSection = sections[index];
    
    if (currentSection === "gut-health") {
        buttonContainer.classed("active", false);
    }
});

function animateGlucosePlot(mealPhase, selectedCarb) {
    if (!state.glucoseData || state.glucoseData.length === 0) {
        console.error("Glucose data is not available!");
        return;
    }

    state.mealSelections[mealPhase] = selectedCarb;

    const visualization = state.visualizations[mealPhase];
    if (!visualization) return;

    const { plots } = visualization;

    const carbMapping = {
        "low-carb": "Low",
        "medium-carb": "Moderate",
        "high-carb": "High"
    };
    const mappedCarb = carbMapping[selectedCarb];

    const mealMapping = {
        "breakfast": "Breakfast Phase",
        "lunch": "Lunch Phase",
        "dinner": "Dinner Phase"
    };
    const mappedMealPhase = mealMapping[mealPhase];

    const filteredData = state.glucoseData.filter(d => {
        const matches = d.mealPhase === mappedMealPhase && d.carbCategory === mappedCarb;
        return matches;
    });

    let groupedData = d3.group(filteredData, d => d.diabetesStatus);

    ["No Diabetes", "Pre-Diabetes", "Type 2 Diabetes"].forEach((status, i) => {
        const plot = plots[i];
        if (!plot) return;

        const dataForStatus = groupedData.get(status) || [];
        const sortedData = dataForStatus.sort((a, b) => a.timestamp - b.timestamp);

        if (sortedData.length > 0) {
            const startTime = sortedData[0].timestamp;
            const endTime = new Date(startTime.getTime() + (3 * 60 * 60 * 1000));

            plot.xScale.domain([startTime, endTime]);
            plot.yScale.domain([0, 400]);

            plot.xAxis.transition().duration(1000)
                .call(d3.axisBottom(plot.xScale)
                    .ticks(4)
                    .tickFormat(d => {
                        const hours = d3.timeHour.count(startTime, d);
                        return `${hours}hr`;
                    }));
            
            plot.yAxis.transition().duration(1000)
                .call(d3.axisLeft(plot.yScale));

            plot.path
                .datum(sortedData)
                .transition()
                .duration(1000)
                .attr("d", plot.line);

            // Remove any existing "no data" message
            plot.group.selectAll(".no-data-message").remove();
        } else {
            // Clear the path
            plot.path.attr("d", null);
            
            // Remove any existing "no data" message
            plot.group.selectAll(".no-data-message").remove();
            
            // Add "no data" message
            plot.group.append("text")
                .attr("class", "no-data-message")
                .attr("x", plot.xScale.range()[1] / 2)
                .attr("y", plot.yScale.range()[0] / 2)
                .attr("text-anchor", "middle")
                .attr("fill", "gray")
                .text("No data available for this combination");
        }
    });
}

// Update the style element
const style = document.createElement('style');
style.textContent = `
    body {
        transition: background-color 1s ease;
    }

    .character-description {
        text-align: center;
        font-size: 24px;
        margin-top: 20px;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    }
    
    .step.active .character-description {
        opacity: 1;
    }

    .tooltip {
        position: absolute;
        padding: 8px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid #ddd;
        border-radius: 4px;
        pointer-events: none;
        font-size: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .focus circle {
        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));
    }
`;
document.head.appendChild(style);


