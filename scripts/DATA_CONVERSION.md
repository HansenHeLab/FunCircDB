# Data Conversion Instructions

## Step 1: Export RDS to JSON in R

Run this R script to export your RDS files to JSON format:

```r
library(jsonlite)

# Set working directory to your data folder
setwd("/path/to/funcirc/server/data")

# Export each RDS file
screen_data <- readRDS("screen_data.rds")
write_json(screen_data, "her-et-al/screen_data.json", pretty = FALSE)

filtered_annotation <- readRDS("filtered_annotation.rds")
write_json(filtered_annotation, "her-et-al/annotations.json", pretty = FALSE)

# Liu et al.
liu_data_list <- readRDS("liu_data_list.rds")
for (cell_line in names(liu_data_list)) {
  dir.create(paste0("liu-et-al/", tolower(cell_line)), recursive = TRUE, showWarnings = FALSE)
  write_json(liu_data_list[[cell_line]], paste0("liu-et-al/", tolower(cell_line), "/data.json"), pretty = FALSE)
}

# Li et al.
li_data_list <- readRDS("li_et_al_data_list.rds")
for (tissue in names(li_data_list)) {
  dir.create(paste0("li-et-al/", tolower(tissue)), recursive = TRUE, showWarnings = FALSE)
  write_json(li_data_list[[tissue]], paste0("li-et-al/", tolower(tissue), "/data.json"), pretty = FALSE)
}

# Chen et al.
all_circ_data <- readRDS("all_circ_data.rds")
all_linear_data <- readRDS("all_linear_data.rds")
chen_annotation <- readRDS("chen_annotation.rds")
dir.create("chen-et-al", showWarnings = FALSE)
write_json(all_circ_data, "chen-et-al/circ_data.json", pretty = FALSE)
write_json(all_linear_data, "chen-et-al/linear_data.json", pretty = FALSE)
write_json(chen_annotation, "chen-et-al/annotations.json", pretty = FALSE)

# Clinical datasets
arul <- readRDS("arul.rds")
write_json(arul, "clinical/arul-et-al.json", pretty = FALSE)

merged_CPC <- readRDS("merged_CPC.rds")
write_json(merged_CPC, "clinical/cpcg.json", pretty = FALSE)

bca_merged <- readRDS("bca_merged.rds")
write_json(bca_merged, "clinical/breast-cohort.json", pretty = FALSE)
```

## Step 2: Generate Gene Index Files

After exporting, run the Node.js script to generate search indices:

```bash
npm run convert-data
```

This will create optimized gene index files for fast typeahead search.
