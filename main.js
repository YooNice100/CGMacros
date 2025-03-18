const baseWidth = 1920; 
const baseHeight = 1080; 
const margin = { top: 80, right: 50, bottom: 150, left: 50 };

const scaleFactor = Math.min(
    window.innerWidth / baseWidth,
    window.innerHeight / baseHeight
);

let width = window.innerWidth - margin.left - margin.right;
const height = window.innerHeight - margin.top - margin.bottom;

const sections = [
    "intro", 
    "meet-ben", 
    "meet-tim", 
    "meet-joey", 
    "compare", 
    "breakfast-ben",
    "breakfast-tim",
    "breakfast-joey",
    "breakfast-all",
    "lunch",
    "dinner",
    "final-takeaway"
];

const backgroundColors = { 
    intro: "#FFFACD",        
    "meet-ben": "#FFFACD",    
    "meet-tim": "#FFFACD",   
    "meet-joey": "#FFFACD",   
    compare: "#FFFACD",      
    "gut-health": "#FFFACD", 
    "breakfast-ben": "#FFE4B5",     
    "breakfast-tim": "#FFE4B5",     
    "breakfast-joey": "#FFE4B5",    
    "breakfast-all": "#FFE4B5",    
    lunch: "#87CEEB",        
    dinner: "#B19CD9",        
    "final-takeaway": "#FFFACD"  
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
        
        // Find current section and update plots
        const currentIndex = Math.floor(window.scrollY / window.innerHeight);
        const currentSection = sections[currentIndex];
        
        if (["breakfast", "lunch", "dinner"].includes(currentSection)) {
            animateGlucosePlot(currentSection, state.mealSelections[currentSection] || "low-carb");
        }
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

    const overlay = plotArea.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .style("opacity", 0);


    const focus = group.append("g")
        .attr("class", "focus")
        .style("display", "none");

    focus.append("circle")
        .attr("r", 4.5)
        .attr("fill", type === "No Diabetes" ? "green" : type === "Pre-Diabetes" ? "orange" : "red")
        .attr("stroke", "white")
        .attr("stroke-width", 2);


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

       
        focus.attr("transform", `translate(${xPos},${yPos})`);
        focus.style("display", null);


        focus.select(".guide-x")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", height - yPos);
        
        const timeAfterMeal = d3.timeHour.count(data[0].timestamp, d.timestamp);
        
     
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
    const container = d3.select("body")
        .append("div")
        .attr("class", "button-container")
        .style("position", "fixed")
        .style("bottom", "20px")
        .style("left", "50%")
        .style("transform", "translateX(-50%)")
        .style("text-align", "center")
        .style("z-index", "1000")
        .style("transition", "opacity 0.3s ease-in-out")
        .style("opacity", "0")
        .style("visibility", "hidden");

   
    container.append("div")
        .attr("class", "carb-buttons")
        .style("margin-bottom", "10px");

    container.append("div")
        .attr("class", "gut-health-buttons");

    return container;
}

function createButtons(container, options, callback, type = 'carb') {
    const buttonContainer = container.select(type === 'carb' ? ".carb-buttons" : ".gut-health-buttons");
    buttonContainer.selectAll("*").remove();
    
    if (type === 'gut-health') {
        buttonContainer.append("span")
            .text("Gut Health: ")
            .style("color", "#333")
            .style("margin-right", "10px")
            .style("font-size", "16px")
            .style("font-weight", "bold");
    }
    
    options.forEach((option, i) => {
        buttonContainer.append("button")
            .attr("class", `button ${type}-button`)
            .text(option)
            .attr("data-value", option.toLowerCase().replace(" ", "-"))
            .style("opacity", "1")
            .style("transform", "translateY(0)")
            .on("click", function() {
                const value = d3.select(this).attr("data-value");
                buttonContainer.selectAll(`.${type}-button`).classed("active", false);
                d3.select(this).classed("active", true);
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
       
        const benFigure = drawStickFigure(svg, width / 4, height / 6, 0.8);
        benFigure.attr("id", "ben-small");
        
       
        svg.append("text")
            .attr("x", width / 4)
            .attr("y", height / 6 + 90)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Ben - No Diabetes");

       
        const timFigure = drawStickFigure(svg, width / 2, height / 2, 2);
        timFigure.attr("id", "tim-intro");
        
        return { figures: [benFigure, timFigure] };
    }

    if (type === "meet-joey") {
        
        const benFigure = drawStickFigure(svg, width / 4, height / 6, 0.8);
        benFigure.attr("id", "ben-small");
        
      
        svg.append("text")
            .attr("x", width / 4)
            .attr("y", height / 6 + 90)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Ben - No Diabetes");

        
        const timFigure = drawStickFigure(svg, width / 2, height / 6, 0.8);
        timFigure.attr("id", "tim-small");
        
      
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 6 + 90)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Tim - Pre-Diabetes");

       
        const joeyFigure = drawStickFigure(svg, width / 2, height / 2, 2);
        joeyFigure.attr("id", "joey-intro");
        
        return { figures: [benFigure, timFigure, joeyFigure] };
    }

    if (type === "compare") {
       
        const benFigure = drawStickFigure(svg, width / 4, height / 6, 0.8);
        benFigure.attr("id", "ben-small");
        
        const timFigure = drawStickFigure(svg, width / 2, height / 6, 0.8);
        timFigure.attr("id", "tim-small");
        
        const joeyFigure = drawStickFigure(svg, 3 * width / 4, height / 6, 0.8);
        joeyFigure.attr("id", "joey-small");

      
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
    
    if (type === "reset-section") {
    
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 3)
            .attr("text-anchor", "middle")
            .style("font-size", "32px")
            .style("font-weight", "bold")
            .text("Want to try different choices?");

       
        const resetButton = svg.append("g")
            .attr("class", "reset-button")
            .style("cursor", "pointer")
            .on("click", handleReset);

       
        resetButton.append("rect")
            .attr("x", width / 2 - 100)
            .attr("y", height / 2 - 25)
            .attr("width", 200)
            .attr("height", 50)
            .attr("rx", 25)
            .attr("ry", 25)
            .attr("fill", "#4CAF50")
            .attr("stroke", "#388E3C")
            .attr("stroke-width", 2);

       
        resetButton.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2 + 8)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .style("font-size", "20px")
            .text("Click to Reset");

        resetButton
            .on("mouseover", function() {
                resetButton.select("rect")
                    .transition()
                    .duration(200)
                    .attr("fill", "#45a049");
            })
            .on("mouseout", function() {
                resetButton.select("rect")
                    .transition()
                    .duration(200)
                    .attr("fill", "#4CAF50");
            });

        return { figures: [resetButton] };
    }
    
    if (type === "breakfast-ben") {
        const figure = drawStickFigure(svg, width / 2, height / 6);
        figure.attr("id", "breakfast-ben-figure");
        
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 6 + 90)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Ben - No Diabetes");

        const plotWidth = Math.round(400 * scaleFactor);
        const plotHeight = Math.round(300 * scaleFactor);
        const plot = createGlucosePlot(svg, width / 2 - plotWidth / 2, height / 2.5, plotWidth, plotHeight, "No Diabetes");

        return { figures: [figure], plots: [plot] };
    }

    if (type === "breakfast-tim") {
        const benFigure = drawStickFigure(svg, width / 3, height / 6);
        benFigure.attr("id", "breakfast-ben-figure");
        
        const timFigure = drawStickFigure(svg, 2 * width / 3, height / 6);
        timFigure.attr("id", "breakfast-tim-figure");
        
        svg.append("text")
            .attr("x", width / 3)
            .attr("y", height / 6 + 90)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Ben - No Diabetes");
            
        svg.append("text")
            .attr("x", 2 * width / 3)
            .attr("y", height / 6 + 90)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Tim - Pre-Diabetes");

        const plotWidth = Math.round(400 * scaleFactor);
        const plotHeight = Math.round(300 * scaleFactor);
        
        const benPlot = createGlucosePlot(svg, width / 3 - plotWidth / 2, height / 2.5, plotWidth, plotHeight, "No Diabetes");
        const timPlot = createGlucosePlot(svg, 2 * width / 3 - plotWidth / 2, height / 2.5, plotWidth, plotHeight, "Pre-Diabetes");

        return { figures: [benFigure, timFigure], plots: [benPlot, timPlot] };
    }

    if (type === "breakfast-joey") {
        const figures = ["No Diabetes", "Pre-Diabetes", "Type 2 Diabetes"].map((diabetesType, i) => {
            const x = ((i * 2) + 1) * (width / 6);
            const figure = drawStickFigure(svg, x, height / 6);
            figure.attr("id", `breakfast-${diabetesType}`);
            
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

        const plotWidth = Math.round(400 * scaleFactor);
        const plotHeight = Math.round(300 * scaleFactor);
        
        const plots = ["No Diabetes", "Pre-Diabetes", "Type 2 Diabetes"].map((diabetesType, i) => {
            const x = ((i * 2) + 1) * (width / 6) - (plotWidth / 2);
            return createGlucosePlot(svg, x, height / 2.5, plotWidth, plotHeight, diabetesType);
        });

        return { figures, plots };
    }

    if (type === "breakfast-all") {
        const figures = ["No Diabetes", "Pre-Diabetes", "Type 2 Diabetes"].map((diabetesType, i) => {
            const x = ((i * 2) + 1) * (width / 6);
            const figure = drawStickFigure(svg, x, height / 6);
            figure.attr("id", `breakfast-all-${diabetesType}`);
            
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

        const plotWidth = Math.round(400 * scaleFactor);
        const plotHeight = Math.round(300 * scaleFactor);
        
        const plots = ["No Diabetes", "Pre-Diabetes", "Type 2 Diabetes"].map((diabetesType, i) => {
            const x = ((i * 2) + 1) * (width / 6) - (plotWidth / 2);
            return createGlucosePlot(svg, x, height / 2.5, plotWidth, plotHeight, diabetesType);
        });

        return { figures, plots };
    }

    if (type === "lunch" || type === "dinner") {
        const figures = ["No Diabetes", "Pre-Diabetes", "Type 2 Diabetes"].map((diabetesType, i) => {
            const x = ((i * 2) + 1) * (width / 6);
            const figure = drawStickFigure(svg, x, height / 6);
            figure.attr("id", `${type}-${diabetesType}`);
            
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

        const plotWidth = Math.round(400 * scaleFactor);
        const plotHeight = Math.round(300 * scaleFactor);
        
        const plots = ["No Diabetes", "Pre-Diabetes", "Type 2 Diabetes"].map((diabetesType, i) => {
            const x = ((i * 2) + 1) * (width / 6) - (plotWidth / 2);
            return createGlucosePlot(svg, x, height / 2.5, plotWidth, plotHeight, diabetesType);
        });

        return { figures, plots };
    }
}

let state = {
    glucoseData: [],
    gutHealth: "average-gut-health",
    mealSelections: {
        breakfast: null,
        lunch: null,
        dinner: null
    },
    visualizations: {
        intro: null,
        breakfast: null,
        lunch: null,
        dinner: null,
        gutHealth: null
    }
};


loadGutHealthData("average-gut-health");

const buttonContainer = createButtonContainer();

function handleScroll(event) {
    const currentIndex = Math.floor(window.scrollY / window.innerHeight);
    const currentSection = sections[currentIndex];
    
   
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
 
    d3.selectAll(".step").classed("active", false);
    d3.select(element).classed("active", true);
    
    document.body.style.backgroundColor = backgroundColors[currentSection];
    document.body.style.transition = 'background-color 1s ease';

    if (!state.visualizations[currentSection]) {
        const container = element.querySelector('.visualization-container');
        state.visualizations[currentSection] = initSection(d3.select(container), currentSection);
    }


    if (["breakfast-ben", "breakfast-tim", "breakfast-joey"].includes(currentSection)) {
      
        buttonContainer.style("opacity", "1")
            .style("visibility", "visible")
            .classed("active", true);
            
        createButtons(buttonContainer, ["Low Carb", "Medium Carb"], (value) => {
            state.mealSelections.breakfast = value;
            animateGlucosePlot(currentSection, value);
        }, 'carb');
        
        
        if (!state.mealSelections.breakfast) {
            state.mealSelections.breakfast = "low-carb";
            buttonContainer.select('.carb-button[data-value="low-carb"]')
                .classed("active", true);
        } else {
            buttonContainer.select(`.carb-button[data-value="${state.mealSelections.breakfast}"]`)
                .classed("active", true);
        }
        
       
        if (!state.gutHealth) {
            state.gutHealth = "average-gut-health";
            loadGutHealthData("average-gut-health");
        }
        
 
        animateGlucosePlot(currentSection, state.mealSelections.breakfast || "low-carb");
    } else if (currentSection === "breakfast-all") {
       
        buttonContainer.style("opacity", "1")
            .style("visibility", "visible")
            .classed("active", true);
            
        createButtons(buttonContainer, ["Low Carb", "Medium Carb"], (value) => {
            state.mealSelections.breakfast = value;
            animateGlucosePlot(currentSection, value);
        }, 'carb');
        
        createButtons(buttonContainer, ["Good Gut Health", "Average Gut Health", "Bad Gut Health"], (value) => {
            const gutHealthValue = value.toLowerCase().replace(" ", "-");
            if (gutHealthValue !== state.gutHealth) {
                state.gutHealth = gutHealthValue;
                loadGutHealthData(gutHealthValue);
      
                setTimeout(() => {
                    animateGlucosePlot(currentSection, state.mealSelections.breakfast || "low-carb");
                }, 100);
            }
        }, 'gut-health');
        
   
        if (!state.gutHealth) {
            state.gutHealth = "average-gut-health";
        }
        buttonContainer.select(`.gut-health-button[data-value="${state.gutHealth}"]`)
            .classed("active", true);
        
        if (!state.mealSelections.breakfast) {
            state.mealSelections.breakfast = "low-carb";
        }
        buttonContainer.select(`.carb-button[data-value="${state.mealSelections.breakfast}"]`)
            .classed("active", true);
   
        if (state.glucoseData.length === 0) {
            loadGutHealthData(state.gutHealth);
        }
        
 
        animateGlucosePlot(currentSection, state.mealSelections.breakfast || "low-carb");
    } else if (currentSection === "lunch" || currentSection === "dinner") {

        buttonContainer.style("opacity", "1")
            .style("visibility", "visible")
            .classed("active", true);
            
        createButtons(buttonContainer, ["Low Carb", "Medium Carb", "High Carb"], (value) => {
            state.mealSelections[currentSection] = value;
            animateGlucosePlot(currentSection, value);
        }, 'carb');
        
        createButtons(buttonContainer, ["Good Gut Health", "Average Gut Health", "Bad Gut Health"], (value) => {
            const gutHealthValue = value.toLowerCase().replace(" ", "-");
            if (gutHealthValue !== state.gutHealth) {
                state.gutHealth = gutHealthValue;
                loadGutHealthData(gutHealthValue);
      
                setTimeout(() => {
                    animateGlucosePlot(currentSection, state.mealSelections[currentSection] || "low-carb");
                }, 100);
            }
        }, 'gut-health');
        
      
        if (!state.gutHealth) {
            state.gutHealth = "average-gut-health";
        }
        buttonContainer.select(`.gut-health-button[data-value="${state.gutHealth}"]`)
            .classed("active", true);
        
        if (!state.mealSelections[currentSection]) {
            state.mealSelections[currentSection] = "low-carb";
        }
        buttonContainer.select(`.carb-button[data-value="${state.mealSelections[currentSection]}"]`)
            .classed("active", true);
        
       
        if (state.glucoseData.length === 0) {
            loadGutHealthData(state.gutHealth);
        }
        
     
        animateGlucosePlot(currentSection, state.mealSelections[currentSection] || "low-carb");
    } else if (!["breakfast", "lunch", "dinner"].includes(currentSection)) {
        // Hide button container for non-meal sections
        buttonContainer.style("opacity", "0")
            .style("visibility", "hidden")
            .classed("active", false);
    }

    if (state.visualizations[currentSection]) {
        const visualization = state.visualizations[currentSection];
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


    if (currentSection === "breakfast-all" || currentSection === "lunch" || currentSection === "dinner") {
 
        if (state.glucoseData.length === 0) {
            loadGutHealthData(state.gutHealth || "average-gut-health");
        }
        
     
        buttonContainer.style("opacity", "1")
            .style("visibility", "visible")
            .classed("active", true);
            
       
        const carbOptions = currentSection === "breakfast-all" ? 
            ["Low Carb", "Medium Carb"] : 
            ["Low Carb", "Medium Carb", "High Carb"];
            
        createButtons(buttonContainer, carbOptions, (value) => {
            state.mealSelections[currentSection === "breakfast-all" ? "breakfast" : currentSection] = value;
            animateGlucosePlot(currentSection, value);
        }, 'carb');
        
        createButtons(buttonContainer, ["Good Gut Health", "Average Gut Health", "Bad Gut Health"], (value) => {
            const gutHealthValue = value.toLowerCase().replace(" ", "-");
            if (gutHealthValue !== state.gutHealth) {
                state.gutHealth = gutHealthValue;
                loadGutHealthData(gutHealthValue);
              
                setTimeout(() => {
                    animateGlucosePlot(currentSection, state.mealSelections[currentSection === "breakfast-all" ? "breakfast" : currentSection] || "low-carb");
                }, 100);
            }
        }, 'gut-health');
        
  
        if (!state.gutHealth) {
            state.gutHealth = "average-gut-health";
        }
        buttonContainer.select(`.gut-health-button[data-value="${state.gutHealth}"]`)
                .classed("active", true);
        
        const mealType = currentSection === "breakfast-all" ? "breakfast" : currentSection;
        if (!state.mealSelections[mealType]) {
            state.mealSelections[mealType] = "low-carb";
        }
        buttonContainer.select(`.carb-button[data-value="${state.mealSelections[mealType]}"]`)
                .classed("active", true);
    
        animateGlucosePlot(currentSection, state.mealSelections[mealType] || "low-carb");
    }
}).onStepExit(({ element, index }) => {
    const currentSection = sections[index];
});

function animateGlucosePlot(mealPhase, selectedCarb) {
    if (!state.glucoseData || state.glucoseData.length === 0) {
        console.error("Glucose data is not available!");
        return;
    }

    const visualization = state.visualizations[mealPhase];
    if (!visualization) return;

    const { plots } = visualization;
    if (!plots) return;

    const carbMapping = {
        "low-carb": "Low",
        "medium-carb": "Moderate",
        "high-carb": "High"
    };
    const mappedCarb = carbMapping[selectedCarb];

    const mealMapping = {
        "breakfast-ben": "Breakfast Phase",
        "breakfast-tim": "Breakfast Phase",
        "breakfast-joey": "Breakfast Phase",
        "breakfast-all": "Breakfast Phase",
        "breakfast": "Breakfast Phase",
        "lunch": "Lunch Phase",
        "dinner": "Dinner Phase"
    };
    const mappedMealPhase = mealMapping[mealPhase];

 
    let diabetesTypes = [];
    if (mealPhase === "breakfast-ben") {
        diabetesTypes = ["No Diabetes"];
    } else if (mealPhase === "breakfast-tim") {
        diabetesTypes = ["No Diabetes", "Pre-Diabetes"];
    } else if (mealPhase === "breakfast-joey" || mealPhase === "breakfast-all" || mealPhase === "breakfast") {
        diabetesTypes = ["No Diabetes", "Pre-Diabetes", "Type 2 Diabetes"];
    } else if (mealPhase === "lunch" || mealPhase === "dinner") {
      
        diabetesTypes = ["No Diabetes", "Pre-Diabetes", "Type 2 Diabetes"];
    }

    diabetesTypes.forEach((diabetesStatus, i) => {
        const plot = plots[i];
        if (!plot) return;

    
        let dataForStatus = state.glucoseData.filter(d => {
            return d.mealPhase === mappedMealPhase && 
                   d.carbCategory === mappedCarb &&
                   d.diabetesStatus === diabetesStatus;
        });

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

        
            plot.group.selectAll(".no-data-message").remove();
        } else {
          
            plot.path.attr("d", null);
          
            plot.group.selectAll(".no-data-message").remove();
            
         
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


window.addEventListener('resize', () => {
    const newScaleFactor = Math.min(
        window.innerWidth / baseWidth,
        window.innerHeight / baseHeight
    );

    margin.top = Math.round(80 * (window.innerHeight / baseHeight));
    margin.right = Math.round(50 * (window.innerWidth / baseWidth));
    margin.bottom = Math.round(150 * (window.innerHeight / baseHeight));
    margin.left = Math.round(50 * (window.innerWidth / baseWidth));
    
    width = window.innerWidth - margin.left - margin.right;
    height = window.innerHeight - margin.top - margin.bottom;
    

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


window.addEventListener('load', function() {
    const scrollTarget = localStorage.getItem('scrollTarget');
    if (scrollTarget) {
     
        localStorage.removeItem('scrollTarget');
 
        const targetIndex = sections.indexOf(scrollTarget);
        if (targetIndex !== -1) {
    
            window.scrollTo({
                top: window.innerHeight * targetIndex,
                behavior: 'smooth'
            });
        }
    }
});

function handleReset() {
  
    const previousGutHealth = state.gutHealth;
    
  
    localStorage.setItem('scrollTarget', 'gut-health');
    
    // Reset the state
    state = {
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
    

    d3.selectAll(".step").classed("active", false);
    d3.selectAll(".button").classed("active", false);
    

    buttonContainer.style("opacity", "0")
        .style("visibility", "hidden")
        .classed("active", false);


    d3.selectAll('.tooltip, .meal-tooltip').remove();

    // Scroll to top first
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

 
    setTimeout(() => {
        window.location.reload();
    }, 500);
}


