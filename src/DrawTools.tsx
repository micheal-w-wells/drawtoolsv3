import React, { useEffect, useRef, useState } from "react";
import L, { DomEvent } from "leaflet";
import "leaflet-editable";
import { LayersControlProvider } from "./layerControlContext";
import { Button, IconButton } from "@material-ui/core";
import * as turf from "@turf/turf";
// Images for IconButtons
import line from "./images/line.png";
import polygon from "./images/polygon.png";
import circle from "./images/circle.png";
import rectangle from "./images/rectangle.png";
import location from "./images/placeholder.png";
import trash from "./images/delete.png";

enum DrawMode {
  POLYLINE = "polyline",
  POLYGON = "polygon",
  MARKER = "marker",
  RECTANGLE = "rectangle",
  CIRCLE = "circle",
  DONUT = "donut",
  DELETE = "delete"
}

const POSITION_CLASSES: any = {
  bottomleft: "leaflet-bottom leaflet-left",
  bottomright: "leaflet-bottom leaflet-right",
  topleft: "leaflet-top leaflet-left",
  topright: "leaflet-top leaflet-right"
};

const convertLineStringToPoly = (
  aGeo: any,
  layerObj: any,
  drawingState: DrawMode
) => {
  if (aGeo?.geometry.type === "Polygon" && drawingState === DrawMode.POLYGON) {
    console.log(layerObj._latlngs);
    if (layerObj._latlngs[0].length < 3) {
      // returns this because this is for num vertices < 3 so it's an error on purpose
      return { ...aGeo, geometry: result.features[0].geometry };
    }
  }
  if (aGeo?.geometry.type === "LineString") {
    if (layerObj._latlngs.length > 1) {
      const buffer = prompt("Enter buffer width (total) in meters", "1");
      const buffered = turf.buffer(aGeo.geometry, parseInt(buffer, 10) / 1000, {
        units: "kilometers",
        steps: 1
      });
      const result = turf.featureCollection([buffered, aGeo.geometry]);
      return { ...aGeo, geometry: result.features[0].geometry };
    }
    // returns this because this is for num vertices < 2 so it's an error on purpose
    return { ...aGeo, geometry: result.features[0].geometry };
  }
  if (aGeo?.geometry.type === "Point") {
    if (layerObj._mRadius) {
      aGeo = {
        ...aGeo,
        properties: { ...aGeo.properties, radius: layerObj.getRadius() }
      };
      aGeo = turf.buffer(aGeo, aGeo.properties.radius, { units: "meters" });
    }
    aGeo = {
      ...aGeo,
      properties: { ...aGeo.properties, radius: 40 }
    };
    aGeo = turf.buffer(aGeo, aGeo.properties.radius, { units: "meters" });
  }
  return aGeo;
};

export const DrawTools = (props: any) => {
  const [drawingState, setDrawingState] = useState<any>(null);
  const [layerToEdit, setLayerToEdit] = useState();
  const [shapeRef, setShapeRef] = useState(null);
  const [editing, setEditing] = useState(false);
  const positionClass =
    (props?.position && POSITION_CLASSES[(props as any).position]) ||
    POSITION_CLASSES.topleft;
  const divref = useRef();
  var tools = new L.Editable(props.map, { ...props.map });

  useEffect(() => {
    DomEvent.disableClickPropagation((divref as any)?.current);
  });

  useEffect(() => {
    switch (drawingState) {
      case DrawMode.POLYLINE:
        tools.startPolyline();
        break;
      case DrawMode.POLYGON:
        tools.startPolygon();
        break;
      case DrawMode.MARKER:
        tools.startMarker();
        break;
      case DrawMode.RECTANGLE:
        tools.startRectangle();
        break;
      case DrawMode.CIRCLE:
        const shape = tools.startCircle();
        setShapeRef(shape as any);
        break;
      default:
        tools.stopDrawing();
    }
  }, [drawingState]);

  useEffect(() => {
    if (drawingState === null) tools.stopDrawing();
  }, [drawingState]);

  const onDrawCreate = (e: any) => {
    try {
      var newLayer = e.layer;

      //constext.layerContainer.addLayer(newLayer);
      var aGeo = newLayer.toGeoJSON();
      aGeo = convertLineStringToPoly(aGeo, newLayer, drawingState);

      setDrawingState(null);
      //app specific: (context.layerContainer as any).clearLayers();
      //app specific: props.geometryState.setGeometry([aGeo]);
      props.setGeometry([aGeo]);
    } catch (error) {
      alert("Not enough vertices to draw");
    }
  };

  tools.on("editable:drawing:cancel", (e) => {
    e.layer.remove();
  });

  tools.on("editable:drawing:commit", (e) => {
    try {
      onDrawCreate(e);
    } catch (error) {
      alert("Not enough vertices to draw");
    }
    e.layer.disableEdit();
  });

  tools.on("editable:enable", (e) => {
    if (editing) {
      console.log("layerToEdit useState", layerToEdit);
      console.log("inEnable", e);
      console.log("map", props.map);
    }
  });

  tools.on("editable:editing", (e) => {
    console.log("is editing");
  });

  /*const onEditStop = (e: any) => {
    // App SPecific
    // var updatedGeoJSON = [];
    // (context.layerContainer as any).eachLayer((layer) => {
    //   let aGeo = layer.toGeoJSON();
    //   if (layer.feature.radius) {
    //      aGeo = { ...aGeo, properties: { ...aGeo.properties, radius: layer._mRadius }};
    //   }
    //   aGeo = convertLineStringToPoly(aGeo);
    //   updatedGeoJSON.push(aGeo);
    // });
    // props.geometryState.setGeometry(updatedGeoJSON);
  };*/

  return (
    <LayersControlProvider value={null}>
      <div ref={divref} className={positionClass}>
        <div
          className="leaflet-bar leaflet-control"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <IconButton
            style={{ width: 44, height: 44 }}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              setDrawingState(DrawMode.POLYLINE);
            }}
          >
            <img
              style={{ width: 32, height: 32 }}
              src={line}
              alt={"draw a polyline"}
            />
          </IconButton>
          <IconButton
            style={{ width: 44, height: 44 }}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              setDrawingState(DrawMode.POLYGON);
            }}
          >
            <img
              style={{ width: 32, height: 32 }}
              src={polygon}
              alt={"draw a polygon"}
            />
          </IconButton>
          <IconButton
            style={{ width: 44, height: 44 }}
            onClick={() => setDrawingState(DrawMode.RECTANGLE)}
          >
            <img
              style={{ width: 32, height: 32 }}
              src={rectangle}
              alt={"draw rectangle"}
            />
          </IconButton>
          <IconButton
            style={{ width: 44, height: 44 }}
            onClick={() => setDrawingState(DrawMode.CIRCLE)}
          >
            <img
              style={{ width: 32, height: 32 }}
              src={circle}
              alt={"draw circle"}
            />
          </IconButton>
          <IconButton
            style={{ width: 44, height: 44 }}
            onClick={() => setDrawingState(DrawMode.MARKER)}
          >
            <img
              style={{ width: 32, height: 32 }}
              src={location}
              alt="drop a marker on the map"
            />
          </IconButton>
        </div>
        <div
          className="leaflet-bar leaflet-control"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <IconButton
            style={{ width: 44, height: 44 }}
            onClick={() => setDrawingState(DrawMode.DELETE)}
          >
            <img
              style={{ width: 32, height: 32 }}
              src={trash}
              alt={"delete geometry"}
            />
          </IconButton>
          <IconButton
            style={{ width: 44, height: 44 }}
            onClick={() => {
              var layer = L.GeoJSON.geometryToLayer(props.geometry[0]);
              console.log("tools", tools);
              //layer.addTo(props.map);
              //(layer as any).enableEdit();
              tools.map.addLayer(layer);
              tools.map.editEnable();
              setLayerToEdit(layer);
              props.setGeometry([]);
              setDrawingState(DrawMode.POLYGON);
              setEditing(true);
            }}
          ></IconButton>
          <Button
            onClick={() => {
              var polyline = L.polyline([
                [43.1, 1.2],
                [43.2, 1.3],
                [43.3, 1.2]
              ]).addTo(props.map);
              polyline.enableEdit();
            }}
          >
            This Button
          </Button>
        </div>
        <div className="leaflet-bar leaflet-control">
          {drawingState && (
            <>
              {drawingState === DrawMode.POLYGON && (
                <>
                  <Button
                    onClick={() => {
                      (tools as any).commitDrawing();
                      setDrawingState(null);
                    }}
                  >
                    Finish
                  </Button>
                  {/*<Button>Delete Last Point</Button>*/}
                </>
              )}
              {drawingState === DrawMode.POLYLINE && (
                <>
                  <Button
                    onClick={() => {
                      tools.commitDrawing();
                      setDrawingState(null);
                      if (editing) {
                        setEditing(false);
                      }
                    }}
                  >
                    Finish
                  </Button>
                  {/*<Button id="#polyline">Delete Last Point</Button>*/}
                </>
              )}
              <Button
                onClick={() => {
                  tools.stopDrawing();
                  setDrawingState(null);
                }}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </LayersControlProvider>
  );
  // Polygon: <div>Icons made by <a href="https://www.flaticon.com/authors/voysla" title="Voysla">Voysla</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
  // Circle: <div>Icons made by <a href="https://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
  // Line: <div>Icons made by <a href="https://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
  // Rectangle: <div>Icons made by <a href="https://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
  // Location: <div>Icons made by <a href="https://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
  // Trash: <div>Icons made by <a href="https://www.flaticon.com/authors/feen" title="feen">feen</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
};
