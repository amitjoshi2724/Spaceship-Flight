package com.spaceshipflight.amitjoshi.spaceshipflight;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Point;
import android.graphics.Path;
/**
 * Created by amitjoshi on 1/8/17.
 */
public class Polygon {
    private int[] xpoints;
    private int[] ypoints;
    private Path path;
    private int npoints;
    private float dx, dy;
    private boolean first = true;
    private Canvas canvas;
    private Paint blackPaint;
    private Paint paint;
    public Polygon(int[] x, int[] y, int ns, float dx, float dy, Canvas canvas1, Paint paint1, Paint blackPaint){
        this.xpoints = x;
        this.ypoints = y;
        this.npoints = ns;
        this.paint = paint1;
        this.paint.setColor(Color.GRAY);
        this.blackPaint = blackPaint;
        this.blackPaint.setColor(Color.BLACK);
        this.canvas = canvas1;
        this.path = new Path();
        this.dx = dx;
        this.dy = dy;
    }

    public boolean contains(Bullet b){
        // 1. Raycast check for bullet center inside polygon
        int intersectCount = 0;
        for (int j = 0; j < npoints; j++) {
            int next = (j + 1) % npoints;
            if (rayCastIntersect(b, new Point(xpoints[j], ypoints[j]), new Point(xpoints[next], ypoints[next]))) {
                intersectCount++;
            }
        }
        if ((intersectCount % 2) == 1) { // odd = inside, even = outside
            return true;
        }

        // 2. Exact Circle vs Edge Distance Test (Option 2)
        double bx = b.getX() + b.radius;
        double by = b.getY() + b.radius;
        double rSq = (double)b.radius * b.radius;

        for (int i = 0; i < npoints; i++) {
            int next = (i + 1) % npoints;
            double x1 = xpoints[i];
            double y1 = ypoints[i];
            double x2 = xpoints[next];
            double y2 = ypoints[next];

            double l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
            double distSq;
            if (l2 == 0) {
                distSq = Math.pow(bx - x1, 2) + Math.pow(by - y1, 2);
            } else {
                double t = Math.max(0.0, Math.min(1.0, ((bx - x1) * (x2 - x1) + (by - y1) * (y2 - y1)) / l2));
                double projX = x1 + t * (x2 - x1);
                double projY = y1 + t * (y2 - y1);
                distSq = Math.pow(bx - projX, 2) + Math.pow(by - projY, 2);
            }

            if (distSq <= rSq) {
                return true;
            }
        }

        return false;
    }

    private boolean rayCastIntersect(Bullet b, Point vertA, Point vertB){
        double aY = vertA.y;
        double bY = vertB.y;
        double aX = vertA.x;
        double bX = vertB.x;
        double pY = b.getY() + b.radius;
        double pX = b.getX() + b.radius;
        if ((aY > pY && bY > pY) || (aY < pY && bY < pY)
                || (aX < pX && bX < pX) || (aX > pX && bX > pX)) {
            return false; // a and b can't both be above or below pt.y, and a or
            // b must be east of pt.x
        }

        double m = (aY - bY) / (aX - bX); // Rise over run
        double bee = (-aX) * m + aY; // y = mx + b
        double x = (pY - bee) / m; // algebra is neat!
        return x > (pX - 2*b.radius);
    }
    public void tick(){
        for(int i = 0; i < xpoints.length; i++){
            xpoints[i] = (int)(xpoints[i] + dx);
            ypoints[i] = (int)(ypoints[i] + dy);
        }
    }
    public void draw(){
        path.reset();
        path.moveTo(xpoints[0], ypoints[0]); // used for first point
        for(int i = 1; i < npoints; i++){
            path.lineTo(xpoints[i], ypoints[i]);
        }
        canvas.drawPath(path, paint);
    }
    public void clear(){
        path.reset();
        path.moveTo(xpoints[0], ypoints[0]); // used for first point
        for(int i = 1; i < npoints; i++){
            path.lineTo(xpoints[i], ypoints[i]);
        }
        canvas.drawPath(path, blackPaint);
    }
}
