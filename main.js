const baseWidth = 1920; // Base width for scaling
const baseHeight = 1080; // Base height for scaling
const margin = { top: 80, right: 50, bottom: 150, left: 50 };

// Calculate the scale factor based on the current window size
const scaleFactor = Math.min(
    window.innerWidth / baseWidth,
    window.innerHeight / baseHeight
);

let width = window.innerWidth - margin.left - margin.right;
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

    // Add guide lines
    focus.append("line")
        .attr("class", "guide-x")
        .attr("stroke", type === "No Diabetes" ? "green" : type === "Pre-Diabetes" ? "orange" : "red")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3");

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
        
        const xPos = xScale(d.timestamp);
        const yPos = yScale(d.glucose);

        // Update circle position
        focus.attr("transform", `translate(${xPos},${yPos})`);
        focus.style("display", null);

        // Update guide line (vertical only)
        focus.select(".guide-x")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", height - yPos);
        
        const timeAfterMeal = d3.timeHour.count(data[0].timestamp, d.timestamp);
        
        // Format gut health status for display
        const gutHealthDisplay = state.gutHealth
            .split('-')[0]
            .charAt(0).toUpperCase() + state.gutHealth.split('-')[0].slice(1);
            
        tooltip.html(`
            <strong>${type}</strong><br/>
            Time: ${timeAfterMeal}hr<br/>
            Glucose: ${Math.round(d.glucose)} mg/dL<br/>
            Gut Health: ${gutHealthDisplay}
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

function getMealMacros(mealPhase, carbLevel) {
    // Define macronutrient information for each meal and carb level
    const macros = {
        breakfast: {
            "low-carb": {
                carbs: "15g carbs",
                protein: "20g protein",
                fat: "15g fat",
                examples: "Eggs with avocado"
            },
            "medium-carb": {
                carbs: "30g carbs",
                protein: "20g protein",
                fat: "10g fat",
                examples: "Oatmeal with berries"
            },
            "high-carb": {
                carbs: "45g carbs",
                protein: "15g protein",
                fat: "5g fat",
                examples: "Pancakes with syrup"
            }
        },
        lunch: {
            "low-carb": {
                carbs: "20g carbs",
                protein: "25g protein",
                fat: "15g fat",
                examples: "Grilled chicken salad"
            },
            "medium-carb": {
                carbs: "45g carbs",
                protein: "20g protein",
                fat: "10g fat",
                examples: "Turkey sandwich"
            },
            "high-carb": {
                carbs: "60g carbs",
                protein: "15g protein",
                fat: "8g fat",
                examples: "Pasta with marinara"
            }
        },
        dinner: {
            "low-carb": {
                carbs: "20g carbs",
                protein: "30g protein",
                fat: "15g fat",
                examples: "Grilled salmon with vegetables"
            },
            "medium-carb": {
                carbs: "45g carbs",
                protein: "25g protein",
                fat: "12g fat",
                examples: "Rice bowl with chicken"
            },
            "high-carb": {
                carbs: "70g carbs",
                protein: "20g protein",
                fat: "10g fat",
                examples: "Pizza"
            }
        }
    };
    
    return macros[mealPhase][carbLevel];
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
        // Create tooltip div if it doesn't exist
        let mealTooltip = d3.select("body").select(".meal-tooltip");
        if (mealTooltip.empty()) {
            mealTooltip = d3.select("body").append("div")
                .attr("class", "meal-tooltip")
                .style("opacity", 0);
        }

        // Add title at the top
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .style("font-size", "24px")
            .style("font-weight", "bold")
            .text(type.charAt(0).toUpperCase() + type.slice(1));

        const figures = ["No Diabetes", "Pre-Diabetes", "Type 2 Diabetes"].map((diabetesType, i) => {
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

            // Add hover area for the stick figure
            const hoverArea = svg.append("rect")
                .attr("x", x - 30)
                .attr("y", height / 6 - 30)
                .attr("width", 60)
                .attr("height", 120)
                .style("fill", "transparent")
                .style("cursor", "pointer");

            // Add hover interactions
            hoverArea
                .on("mouseover", function(event) {
                    const currentCarb = state.mealSelections[type] || "low-carb";
                    const macros = getMealMacros(type, currentCarb);
                    
                    // Calculate fixed position relative to the stick figure
                    const figureRect = this.getBoundingClientRect();
                    const tooltipX = figureRect.right + window.scrollX + 20; // 20px to the right of the figure
                    const tooltipY = figureRect.top + window.scrollY + (figureRect.height / 2) - 30; // Vertically centered
                    
                    mealTooltip.html(`
                        <strong>${currentCarb.replace("-", " ").replace(/(^\w|\s\w)/g, m => m.toUpperCase())}</strong>
                        ${macros.carbs} • ${macros.protein} • ${macros.fat}<br/>
                        <em>${macros.examples}</em>
                    `)
                    .style("left", tooltipX + "px")
                    .style("top", tooltipY + "px")
                    .style("opacity", 1);
                })
                .on("mouseout", function() {
                    mealTooltip.style("opacity", 0);
                });
                
            return figure;
        });

        const plots = ["No Diabetes", "Pre-Diabetes", "Type 2 Diabetes"].map((diabetesType, i) => {
            const plotWidth = Math.round(400 * scaleFactor);
            const plotHeight = Math.round(300 * scaleFactor);
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

    let filteredData = state.glucoseData.filter(d => {
        // Special case for average gut health, pre-diabetic, lunch, low carb
        if (state.gutHealth === "average-gut-health" && 
            d.diabetesStatus === "Pre-Diabetes" && 
            mappedMealPhase === "Lunch Phase" && 
            mappedCarb === "Low") {
            return d.subject === "41" && d.mealPhase === mappedMealPhase && d.carbCategory === mappedCarb;
        }
        
        // Default filtering
        return d.mealPhase === mappedMealPhase && d.carbCategory === mappedCarb;
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
        font-size: ${Math.round(24 * scaleFactor)}px;
        margin-top: ${Math.round(20 * scaleFactor)}px;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    }
    
    .step.active .character-description {
        opacity: 1;
    }

    .tooltip, .meal-tooltip {
        position: absolute;
        padding: ${Math.round(8 * scaleFactor)}px ${Math.round(12 * scaleFactor)}px;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid #ddd;
        border-radius: ${Math.round(6 * scaleFactor)}px;
        pointer-events: none;
        font-size: ${Math.round(12 * scaleFactor)}px;
        box-shadow: 0 ${Math.round(2 * scaleFactor)}px ${Math.round(4 * scaleFactor)}px rgba(0,0,0,0.1);
        transition: opacity 0.2s ease;
        line-height: 1.4;
        z-index: 1000;
    }

    .meal-tooltip {
        max-width: ${Math.round(180 * scaleFactor)}px;
        text-align: left;
        white-space: nowrap;
    }

    .meal-tooltip strong {
        display: block;
        margin-bottom: ${Math.round(4 * scaleFactor)}px;
        font-size: ${Math.round(13 * scaleFactor)}px;
    }

    .meal-tooltip em {
        display: block;
        margin-top: ${Math.round(4 * scaleFactor)}px;
        color: #666;
        font-size: ${Math.round(11 * scaleFactor)}px;
        font-style: italic;
    }

    .focus circle {
        filter: drop-shadow(0 ${Math.round(2 * scaleFactor)}px ${Math.round(2 * scaleFactor)}px rgba(0,0,0,0.2));
    }
`;
document.head.appendChild(style);

// Add window resize handler
window.addEventListener('resize', () => {
    const newScaleFactor = Math.min(
        window.innerWidth / baseWidth,
        window.innerHeight / baseHeight
    );
    
    // Update margin and dimensions
    margin.top = Math.round(80 * (window.innerHeight / baseHeight));
    margin.right = Math.round(50 * (window.innerWidth / baseWidth));
    margin.bottom = Math.round(150 * (window.innerHeight / baseHeight));
    margin.left = Math.round(50 * (window.innerWidth / baseWidth));
    
    width = window.innerWidth - margin.left - margin.right;
    height = window.innerHeight - margin.top - margin.bottom;
    
    // Redraw the current section
    const currentIndex = Math.floor(window.scrollY / window.innerHeight);
    const currentSection = sections[currentIndex];
    
    if (state.visualizations[currentSection]) {
        const container = document.querySelector('.visualization-container');
        container.innerHTML = '';
        state.visualizations[currentSection] = initSection(d3.select(container), currentSection);
        
        if (["breakfast", "lunch", "dinner"].includes(currentSection)) {
            animateGlucosePlot(currentSection, state.mealSelections[currentSection] || "low-carb");
        }
    }
});


