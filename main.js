const margin = { top: 50, right: 50, bottom: 50, left: 50 };
const width = window.innerWidth - margin.left - margin.right;
const height = window.innerHeight * 0.8 - margin.top - margin.bottom;

const backgroundColors = { breakfast: "#FFDAB9", lunch: "#FFFACD", dinner: "#D8BFD8" };

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
    
    group.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .text(type);
    
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
    
    return { path, xScale, yScale, line, group, xAxis, yAxis };
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
        const plots = ["No Diabetes", "Pre-Diabetes", "Type 2 Diabetes"].map((type, i) => {
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

function handleScroll(event) {
    const currentIndex = Math.floor(window.scrollY / window.innerHeight);
    
    if (currentIndex > 1 && !state.gutHealth) {
        window.scrollTo({
            top: window.innerHeight,
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
        if (state.visualizations[currentSection] && state.visualizations[currentSection].plots) {
            state.visualizations[currentSection].plots.forEach(plot => {
                plot.group.style("opacity", 1);
            });
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
            animateGlucosePlot(currentSection, value);
        });
        
        if (!state.mealSelections[currentSection]) {
            state.mealSelections[currentSection] = "low-carb";
            animateGlucosePlot(currentSection, "low-carb");
        } else {
            animateGlucosePlot(currentSection, state.mealSelections[currentSection]);
        }
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
            plot.yScale.domain([0, d3.max(sortedData, d => d.glucose) * 1.1]);

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
        }
    });
}


