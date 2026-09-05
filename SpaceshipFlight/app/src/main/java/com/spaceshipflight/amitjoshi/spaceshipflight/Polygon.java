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
        int intersectCount = 0;
        for (int j = 0; j < npoints - 1; j++) { //take out -1 if it doesn't work
            if (rayCastIntersect(b, new Point(xpoints[j], ypoints[j]), new Point(xpoints[j+1], ypoints[j+1]))) {
                intersectCount++;
            }
        }
        return ((intersectCount % 2) == 1); // odd = inside, even = outside;
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
