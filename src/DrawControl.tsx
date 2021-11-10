import { useEffect, useRef, useState } from "react";
import { IconButton } from "@material-ui/core";
import { LayersControlProvider } from "./layerControlContext";
import L, { DomEvent, LatLngBoundsExpression, LatLngTuple } from "leaflet";
import "leaflet-editable";
import * as turf from "@turf/turf";

import EditIcon from "@material-ui/icons/Edit";
import SaveIcon from "@material-ui/icons/Save";
import DeleteIcon from "@material-ui/icons/Delete";

import rectangle from "./images/rectangle.png";

const POSITION_CLASSES: any = {
  bottomleft: "leaflet-bottom leaflet-left",
  bottomright: "leaflet-bottom leaflet-right",
  topleft: "leaflet-top leaflet-left",
  topright: "leaflet-top leaflet-right"
};

enum DrawMode {
  POLYLINE = "polyline",
  POLYGON = "polygon",
  MARKER = "marker",
  RECTANGLE = "rectangle",
  CIRCLE = "circle",
  DONUT = "donut",
  DELETE = "delete"
}

export const DrawControl = (props: any) => {
  const positionClass =
    (props?.position && POSITION_CLASSES[(props as any).position]) ||
    POSITION_CLASSES.topleft;

  // ref to shape to enable or disable editing
  const [currentShapeRef, setCurrentShapeRef] = useState(null);

  // current geojson
  const [currentGeo, setCurrentGeo] = useState(null);

  // type of shape
  const [drawMode, setDrawMode] = useState(null);

  // editing bool
  const [isEditing, setIsEditing] = useState(false);

  // just for click blocking
  const divref = useRef();

  useEffect(() => {
    DomEvent.disableClickPropagation((divref as any)?.current);
  });

  // edit tools
  const tools = new L.Editable(props.map, { ...props.map });

  // util to make rect from geo
  const rectangleFromGeo = (geometry: any) => {
    const southWest = [
      (geometry as any)?.geometry.coordinates[0][1][1],
      (geometry as any)?.geometry.coordinates[0][1][0]
    ];
    const northEast = [
      (geometry as any)?.geometry.coordinates[0][3][1],
      (geometry as any)?.geometry.coordinates[0][3][0]
    ];
    return new L.Rectangle([southWest, northEast] as LatLngBoundsExpression);
  };

  //if parent page provides a geometry, do initial
  // set up so that there is a shape to edit.
  useEffect(() => {
    if (props.geometry) {
      setCurrentGeo(props.geometry);
      const rect = rectangleFromGeo(props.geometry);
      const shapeRef = rect.addTo(props.map);
      setCurrentShapeRef(shapeRef as any);
    }
  }, []);

  // called on click from shape button:
  const newShape = (type: DrawMode) => {
    //reset to nothing, should clear screen:
    props.setGeometry(null);
    setCurrentGeo(null);
    // console.log(currentShapeRef);
    (currentShapeRef as any)?.remove();

    // give a new rectangle in edit mode:
    switch (type) {
      case DrawMode.RECTANGLE:
        const shape = tools.startRectangle();
        setCurrentShapeRef(shape as any);
        setDrawMode((DrawMode as any).RECTANGLE);
        setIsEditing(true);
        break;
    }
  };

  // called from event listener, user triggers via save button
  const saveOnEditDisable = async (e: any) => {
    //clear old shape
    console.log("shaperef on save", currentShapeRef);

    await (currentShapeRef as any)?.remove();

    // get geo and pass to parent:
    var newLayer = e.layer;
    var aGeo = newLayer.toGeoJSON();
    props.setGeometry(aGeo);

    // add new shape to map and
    const rect = rectangleFromGeo(aGeo);
    const shapeRef = rect.addTo(props.map);
    // set current geo and ref for this page to edit further:
    setCurrentShapeRef(shapeRef as any);
    setCurrentGeo(aGeo);

    // reset drawing state
    setIsEditing(false);
  };

  //edit button
  const editOnClick = () => {
    // do nothing if already in edit:
    if (!isEditing) {
      // enable editing
      setIsEditing(true);

      // wipe what was on page:
      console.log("shaperef on edit", currentShapeRef);
      (currentShapeRef as any)?.remove();

      // draw a new shape based on existing geo, and enable edit:
      switch (drawMode) {
        case (DrawMode as any).RECTANGLE:
          const rect = rectangleFromGeo(currentGeo);
          const shapeRef = rect.addTo(props.map);
          shapeRef.enableEdit();

          // remove old geo from parent and this page:
          try {
            setCurrentGeo(null);
            props.setGeometry(null);

            // set shaperafe so we can end editing:
            setCurrentShapeRef(shapeRef as any);
          } catch (e) {
            console.log("err");
            console.log(e);
          }
          break;
      }
    }
  };

  /* not needed
   */
  tools.on("editable:drawing:commit", (e) => {
    console.log("commit");
    //  e.layer.remove();
  });

  /* not needed
  tools.on("editable:vertex:dragend", (e) => {
    //  console.log("draggin");
  });*/

  /* not needed
   */
  tools.on("editable:enable", (e) => {
    e.layer.remove();
    console.log("enable");
  });

  // listen for edit disable event so we have access to new shape:
  tools.on("editable:disable", (e) => {
    e.layer.remove();
    console.log("disable");
    saveOnEditDisable(e);
  });

  return (
    <LayersControlProvider value={null as any}>
      <div ref={divref as any} className={positionClass}>
        {/******* Shape Draw Buttons *******/}
        <div
          className="leaflet-bar leaflet-control"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <IconButton
            style={{ width: 44, height: 44 }}
            onClick={() => newShape(DrawMode.RECTANGLE)}
          >
            <img
              style={{ width: 32, height: 32 }}
              src={rectangle}
              alt={"draw rectangle"}
            />
          </IconButton>
        </div>
        {/******* Action Buttons *******/}
        <div
          className="leaflet-bar leaflet-control"
          style={{ display: "flex", flexDirection: "column" }}
        >
          {/* EDIT */}
          <IconButton onClick={editOnClick}>
            <EditIcon />
          </IconButton>

          {/* SAVE */}
          <IconButton
            onClick={() => {
              // disable edit and will trigger editable:disable event
              (currentShapeRef as any)?.disableEdit();
              //(currentShapeRef as any).remove();
            }}
          >
            <SaveIcon />
          </IconButton>

          {/* DELETE */}
          <IconButton
            onClick={() => {
              //reset editing state
              setIsEditing(false);
              try {
                // clear map:
                (currentShapeRef as any)?.disableEdit();
                (currentShapeRef as any)?.remove();
              } catch (e) {
                console.log("nothing to disable");
              }
              setCurrentGeo(null);
              props.setGeometry(null);
            }}
          >
            <DeleteIcon />
          </IconButton>
        </div>
      </div>
    </LayersControlProvider>
  );
};
